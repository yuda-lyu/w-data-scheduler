import fs from 'fs'
import path from 'path'
import w from 'wsemi'
import assert from 'assert'
import fsTreeFolder from 'wsemi/src/fsTreeFolder.mjs'
import WDataScheduler from '../src/WDataScheduler.mjs'


//規格對應(R-02, 列舉層數):
//  S1. 防抖補掃(coreRetake)只掃[刪除tag]資料夾之第1層(tag檔皆平放於該夾下), 不列舉其子資料夾內之檔
//  S2. 第1層之tag檔仍被掃到並處理(超過容許值者釋放tag, 並發出proc-retake-remove之release-tag與done)
//  S3. 補掃不得因wsemi列舉函數之opt簽章而報錯(舊寫法以數字為第2參數, 於wsemi 1.9.80起拋invalid opt)
//可觀察量: fs.readdirSync之呼叫路徑(窮舉會讀子夾, 第1層不會), 行為層無法分辨第1層與窮舉(子層之檔名不對應任何tag)

describe('retakeLevel', function() {

    //fdBase, 本檔臨時資料夾, 測完刪除
    let fdBase = './test/_tmp/retakeLevel'

    //tolerance, 刪除任務之防抖時長(ms), 取足夠長使run2內之補掃不會誤釋放新增之tag; run3前改寫tag檔之時間為過去, 使其必定超過容許值(不以延時等待)
    let tolerance = 60 * 1000
    let timeOld = '2000-01-01T00:00:00+08:00'

    //spyReaddir, 記錄fs.readdirSync之呼叫路徑(wsemi之列舉函數以Node內建之fs注入, 即同一物件)
    let spyReaddir = () => {
        let calls = []
        let ori = fs.readdirSync
        fs.readdirSync = function(...args) {
            calls.push(path.resolve(String(args[0])))
            return ori.apply(this, args)
        }
        return {
            calls,
            restore: () => {
                fs.readdirSync = ori
            },
        }
    }

    //isUnder, 路徑p是否位於資料夾fd之下(不含fd本身)
    let isUnder = (p, fd) => {
        let rel = path.relative(path.resolve(fd), p)
        return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel)
    }

    //mkTree, 建立含多層子夾之測試樹: sub/n1.json, sub/deeper/n2.json
    let mkTree = (fd) => {
        w.fsCleanFolder(fd)
        w.fsWriteText(`${fd}/sub/n1.json`, 'n1')
        w.fsWriteText(`${fd}/sub/deeper/n2.json`, 'n2')
    }

    after(() => {
        w.fsDeleteFolder(fdBase)
    })

    it('spy自檢: fsTreeFolder窮舉(levelLimit:null)讀得到子夾, {levelLimit:1}不讀', function() {

        let fd = `${fdBase}/probe`
        mkTree(fd)

        //窮舉(刻意窮舉: 此為探測可觀察量之對照, 不是src站點)
        let spyAll = spyReaddir()
        let rAll = null
        try {
            rAll = fsTreeFolder(fd, { levelLimit: null })
        }
        finally {
            spyAll.restore()
        }
        let cntAllSub = spyAll.calls.filter((p) => isUnder(p, fd)).length
        assert.ok(cntAllSub >= 2, 'exhaustive must read sub folders') //讀sub與sub/deeper
        assert.ok(rAll.some((v) => v.name === 'n2.json'), 'exhaustive must list nested files')

        //第1層
        let spy1 = spyReaddir()
        let r1 = null
        try {
            r1 = fsTreeFolder(fd, { levelLimit: 1 })
        }
        finally {
            spy1.restore()
        }
        let cnt1Root = spy1.calls.filter((p) => p === path.resolve(fd)).length
        let cnt1Sub = spy1.calls.filter((p) => isUnder(p, fd)).length
        assert.ok(cnt1Root === 1, 'level 1 must read root once')
        assert.ok(cnt1Sub === 0, 'level 1 must not read sub folders')
        assert.ok(!r1.some((v) => v.name === 'n1.json' || v.name === 'n2.json'), 'level 1 must not list nested files')
        assert.ok(r1.some((v) => v.name === 'sub' && v.isFolder), 'level 1 lists the folder itself')

        w.fsDeleteFolder(fd)
    })

    it('coreRetake只掃[刪除tag]資料夾第1層: 不讀子夾, 第1層tag仍被釋放, 無錯誤', async function() {

        let fdTagRemove = `${fdBase}/scan/tagRemove`
        let fdTaskCpActualSrc = `${fdBase}/scan/taskCpActualSrc`
        let fdTaskCpSrc = `${fdBase}/scan/taskCpSrc`
        w.fsCleanFolder(fdTagRemove)
        w.fsCleanFolder(fdTaskCpActualSrc)
        w.fsCleanFolder(fdTaskCpSrc)

        let a = { id: '114115', hash: 'abc' }
        let b = { id: '114116', hash: 'def' }

        //run, 執行一次偵測, 回傳change事件, spy為true時記錄執行期間之fs.readdirSync呼叫
        let run = async(itemsNew, itemsCurrent, spy = false) => {
            let pm = w.genPm()
            let msChange = []
            let sp = spy ? spyReaddir() : null
            let ev = null
            try {
                ev = await WDataScheduler({
                    fdTagRemove,
                    fdTaskCpActualSrc,
                    fdTaskCpSrc,
                    srLog: { info: () => {}, warn: () => {}, error: () => {} },
                    useShowLog: false,
                    timeToleranceRemove: tolerance,
                    funGetNew: async() => itemsNew,
                    funGetCurrent: async() => itemsCurrent,
                    funRemove: async() => {},
                    funAdd: async() => {},
                    funModify: async() => {},
                })
                ev.on('change', (msg) => {
                    msChange.push({ ...msg })
                })
                ev.on('end', () => {
                    pm.resolve()
                })
                await pm
            }
            finally {
                if (sp) {
                    sp.restore()
                }
            }
            return { msChange, calls: sp ? sp.calls : [] }
        }

        //run1: 新增a, b
        await run([a, b], [])

        //run2: 刪除b, 會於[刪除tag]資料夾新增tag檔b(第1層)
        let r2 = await run([a], [a, b])
        assert.ok(r2.msChange.some((v) => v.event === 'proc-remove-callfun-remove' && v.id === b.id && v.msg === 'add-tag'), 'run2 must add tag')
        assert.ok(w.fsIsFile(`${fdTagRemove}/${b.id}`), 'tag file at level 1 must exist')
        assert.ok(!r2.msChange.some((v) => v.event === 'proc-retake-remove'), 'run2 must not release the tag within tolerance')

        //子夾與其內之檔(第2層以下)
        w.fsWriteText(`${fdTagRemove}/sub/n1.json`, 'n1')
        w.fsWriteText(`${fdTagRemove}/sub/deeper/n2.json`, 'n2')

        //改寫tag檔之時間為過去, 視同已超過容許值
        w.fsWriteText(`${fdTagRemove}/${b.id}`, JSON.stringify({ time: timeOld, hash: '' }))

        //run3: 無差異, 由防抖補掃釋放b之tag
        let r3 = await run([a], [a], true)

        //S3, 無錯誤(舊寫法於wsemi 1.9.80起會於補掃拋invalid opt, 以error事件呈現)
        let errs = r3.msChange.filter((v) => v.type === 'error')
        assert.ok(errs.length === 0, `retake must not report errors, got ${errs.map((v) => v.event).join(',')}`)

        //S2, 第1層之tag被處理
        let msgs = r3.msChange.filter((v) => v.event === 'proc-retake-remove' && v.id === b.id).map((v) => v.msg)
        assert.deepStrictEqual(msgs, ['release-tag', 'done'])
        assert.ok(!w.fsIsFile(`${fdTagRemove}/${b.id}`), 'tag file at level 1 must be released')

        //S1, 讀了[刪除tag]資料夾本身, 沒讀其子夾
        let cntRoot = r3.calls.filter((p) => p === path.resolve(fdTagRemove)).length
        let cntSub = r3.calls.filter((p) => isUnder(p, fdTagRemove)).length
        assert.ok(cntRoot >= 1, 'retake must read the tag folder')
        assert.ok(cntSub === 0, `retake must not read sub folders of the tag folder, got ${cntSub}`)

        //子層之檔未被動到
        assert.ok(w.fsIsFile(`${fdTagRemove}/sub/n1.json`))
        assert.ok(w.fsIsFile(`${fdTagRemove}/sub/deeper/n2.json`))

        w.fsDeleteFolder(`${fdBase}/scan`)
    })

})
