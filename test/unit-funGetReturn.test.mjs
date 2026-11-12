import w from 'wsemi'
import assert from 'assert'
import WDataScheduler from '../src/WDataScheduler.mjs'


describe('funGetReturn', function() {

    //fdBase, 本檔臨時資料夾, 各案使用獨立子夾, 測完刪除
    let fdBase = './test/_tmp/funGetReturn'

    //evGetNew, evGetCur, 預設事件名
    let evGetNew = 'proc-callfun-getNew'
    let evGetCur = 'proc-callfun-getCurrent'

    //itemsNew, 最新數據
    let itemsNew = [
        {
            'id': '114115',
            'hash': 'abc',
        },
        {
            'id': '114116',
            'hash': 'def',
        },
    ]

    //itemsCurrent, 既有數據
    let itemsCurrent = [
        {
            'id': '114115',
            'hash': 'abc',
        },
    ]

    //invalids, 非陣列之回傳值(含wsemi.ltdtDiffByKey會視為單筆資料之單一物件)
    let invalids = [
        { name: 'undefined', val: undefined },
        { name: 'null', val: null },
        { name: `string 'x'`, val: 'x' },
        { name: 'number 1', val: 1 },
        { name: 'empty object {}', val: {} },
        { name: 'single record object', val: { id: '114116', hash: 'def' } },
    ]

    //rmTime, 移除紀錄內之執行時間欄位
    let rmTime = (v) => {
        let r = { ...v }
        delete r.timeRunStart
        delete r.timeRunEnd
        delete r.timeRunSpent
        return r
    }

    //has
    let has = (o, k) => {
        return Object.prototype.hasOwnProperty.call(o, k)
    }

    //test, 執行一次偵測, 蒐集change事件與srLog紀錄, 以及各函數之呼叫次數
    let test = async(opt = {}) => {

        //retNew, retCur, funGetNew與funGetCurrent之回傳值, 未給予時回傳合法數據
        let retNew = has(opt, 'retNew') ? opt.retNew : itemsNew
        let retCur = has(opt, 'retCur') ? opt.retCur : itemsCurrent

        //sync, funGetNew與funGetCurrent是否為非async函數
        let sync = has(opt, 'sync') ? opt.sync : false

        //useShowLog, 未給予時不傳入optDS, 用以驗證預設值
        let useShowLog = has(opt, 'useShowLog') ? opt.useShowLog : null

        //tag, 各測試使用獨立資料夾
        let tag = has(opt, 'tag') ? opt.tag : 'c0'

        let pm = w.genPm()

        //msChange, msInfo, msError, msConsole
        let msChange = []
        let msInfo = []
        let msError = []
        let msConsole = []
        let consoleLogOri = console.log
        console.log = (...args) => {
            msConsole.push(args)
        }

        //calls, 各函數之呼叫紀錄
        let calls = {
            getNew: 0,
            getCurrent: 0,
            add: [],
            remove: [],
            modify: [],
        }

        //fdTagRemove, fdTaskCpActualSrc, fdTaskCpSrc
        let fdTagRemove = `${fdBase}/${tag}/tagRemove`
        let fdTaskCpActualSrc = `${fdBase}/${tag}/taskCpActualSrc`
        let fdTaskCpSrc = `${fdBase}/${tag}/taskCpSrc`
        w.fsCleanFolder(fdTagRemove)
        w.fsCleanFolder(fdTaskCpActualSrc)
        w.fsCleanFolder(fdTaskCpSrc)

        //funGetNew
        let funGetNew = async() => {
            calls.getNew++
            return retNew
        }
        if (sync) {
            funGetNew = () => {
                calls.getNew++
                return retNew
            }
        }

        //funGetCurrent
        let funGetCurrent = async() => {
            calls.getCurrent++
            return retCur
        }
        if (sync) {
            funGetCurrent = () => {
                calls.getCurrent++
                return retCur
            }
        }

        //funRemove
        let funRemove = async(v) => {
            calls.remove.push(v)
        }

        //funAdd
        let funAdd = async(v) => {
            calls.add.push(v)
        }

        //funModify
        let funModify = async(v) => {
            calls.modify.push(v)
        }

        //srLog
        let srLog = {
            info: (v) => {
                msInfo.push({ ...v })
            },
            warn: () => {},
            error: (v) => {
                msError.push({ ...v })
            },
        }

        let optDS = {
            fdTagRemove,
            fdTaskCpActualSrc,
            fdTaskCpSrc,
            srLog,
            funGetNew,
            funGetCurrent,
            funRemove,
            funAdd,
            funModify,
        }
        if (typeof useShowLog === 'boolean') {
            optDS.useShowLog = useShowLog
        }
        let ev = await WDataScheduler(optDS)
            .catch((err) => {
                console.log(err)
            })
        ev.on('change', (msg) => {
            msChange.push({ ...msg })
        })
        ev.on('end', () => {

            w.fsDeleteFolder(fdTagRemove)
            w.fsDeleteFolder(fdTaskCpActualSrc)
            w.fsDeleteFolder(fdTaskCpSrc)

            console.log = consoleLogOri

            pm.resolve({ msChange: msChange.map(rmTime), msInfo: msInfo.map(rmTime), msError, msConsole, calls })
        })

        return pm
    }

    after(() => {
        w.fsDeleteFolder(fdBase)
    })

    //genMsChangeInvalidNew, funGetNew回傳非陣列時所發送之紀錄: 於funGetNew階段記錄錯誤, 取消本輪, 不呼叫funGetCurrent
    //訊息固定為`funGetNew must return an array`, 不帶輸入值
    let genMsChangeInvalidNew = () => {
        return [
            { type: 'info', event: 'start', msg: 'running...' },
            { type: 'info', event: evGetNew, msg: 'start...' },
            { type: 'error', event: evGetNew, msg: 'funGetNew must return an array' },
            { type: 'info', event: 'cancel-stage-main', msg: `error at ${evGetNew}` },
            { type: 'info', event: 'cancel-stage-beforeEnd', msg: `error at ${evGetNew}` },
            { type: 'info', event: 'end', msg: 'done' },
        ]
    }

    //genMsChangeInvalidCur, funGetCurrent回傳非陣列時所發送之紀錄: 於funGetCurrent階段記錄錯誤, 取消本輪, 不進入比對
    //訊息固定為`funGetCurrent must return an array`, 不帶輸入值
    let genMsChangeInvalidCur = () => {
        return [
            { type: 'info', event: 'start', msg: 'running...' },
            { type: 'info', event: evGetNew, msg: 'start...' },
            { type: 'info', event: evGetNew, num: 2, msg: 'done' },
            { type: 'info', event: evGetCur, msg: 'start...' },
            { type: 'error', event: evGetCur, msg: 'funGetCurrent must return an array' },
            { type: 'info', event: 'cancel-stage-main', msg: `error at ${evGetCur}` },
            { type: 'info', event: 'cancel-stage-beforeEnd', msg: `error at ${evGetCur}` },
            { type: 'info', event: 'end', msg: 'done' },
        ]
    }

    //pickByType, 自change紀錄取出指定type者, 並還原成srLog所接收之紀錄(不含type)
    let pickByType = (ms, type) => {
        return ms
            .filter((v) => {
                return v.type === type
            })
            .map((v) => {
                let r = { ...v }
                delete r.type
                return r
            })
    }

    //assertNoDownstream, funAdd與funRemove與funModify皆未被呼叫
    let assertNoDownstream = (calls) => {
        assert.strict.deepEqual({ add: calls.add, remove: calls.remove, modify: calls.modify }, { add: [], remove: [], modify: [] })
    }

    //funGetNew回傳非陣列
    invalids.forEach((c, k) => {

        it(`test funGetNew回傳${c.name}: 本輪取消, 記錄錯誤事件, funAdd/funRemove/funModify皆未被呼叫`, async () => {
            let r = await test({ tag: `n${k}`, retNew: c.val, useShowLog: false })
            let rr = genMsChangeInvalidNew()

            //funGetNew回傳非陣列時, 於funGetNew階段取消本輪(事件序列與錯誤訊息)
            assert.strict.deepEqual(r.msChange, rr)

            //錯誤事件同時記錄於srLog.error, 其餘事件記錄於srLog.info
            assert.strict.deepEqual(r.msError, pickByType(rr, 'error'))
            assert.strict.deepEqual(r.msInfo, pickByType(rr, 'info'))

            //不進入funGetCurrent與比對, 不連動處理
            assert.strict.deepEqual({ getNew: r.calls.getNew, getCurrent: r.calls.getCurrent }, { getNew: 1, getCurrent: 0 })
            assertNoDownstream(r.calls)
        })

    })

    //funGetCurrent回傳非陣列
    invalids.forEach((c, k) => {

        it(`test funGetCurrent回傳${c.name}: 本輪取消, 記錄錯誤事件, funAdd/funRemove/funModify皆未被呼叫`, async () => {
            let r = await test({ tag: `c${k}`, retCur: c.val, useShowLog: false })
            let rr = genMsChangeInvalidCur()

            //funGetCurrent回傳非陣列時, 於funGetCurrent階段取消本輪(事件序列與錯誤訊息), 不進入比對(無proc-compare事件)
            assert.strict.deepEqual(r.msChange, rr)

            //錯誤事件同時記錄於srLog.error, 其餘事件記錄於srLog.info
            assert.strict.deepEqual(r.msError, pickByType(rr, 'error'))
            assert.strict.deepEqual(r.msInfo, pickByType(rr, 'info'))

            //已呼叫funGetNew與funGetCurrent各1次, 不連動處理
            assert.strict.deepEqual({ getNew: r.calls.getNew, getCurrent: r.calls.getCurrent }, { getNew: 1, getCurrent: 1 })
            assertNoDownstream(r.calls)
        })

    })

    //函數為非async函數時同樣檢查
    it('test funGetNew為非async函數且回傳undefined: 本輪取消, 記錄錯誤事件, 未連動處理', async () => {
        let r = await test({ tag: 's1', retNew: undefined, sync: true, useShowLog: false })
        assert.strict.deepEqual(r.msChange, genMsChangeInvalidNew())
        assertNoDownstream(r.calls)
    })

    it('test funGetCurrent為非async函數且回傳null: 本輪取消, 記錄錯誤事件, 未連動處理', async () => {
        let r = await test({ tag: 's2', retCur: null, sync: true, useShowLog: false })
        assert.strict.deepEqual(r.msChange, genMsChangeInvalidCur())
        assertNoDownstream(r.calls)
    })

    //useShowLog預設為true時, 與既有錯誤路徑一致: 錯誤與取消訊息輸出至console, 且錯誤訊息不帶輸入值
    it('test funGetCurrent回傳非陣列且useShowLog預設為true: 錯誤與取消訊息輸出至console, 錯誤訊息不帶輸入值', async () => {
        let r = await test({ tag: 'l1', retCur: 'secret-value', useShowLog: null })
        let errs = r.msConsole
            .filter((v) => {
                return v[0] instanceof Error
            })
            .map((v) => {
                return v[0].message
            })
        let numCancel = r.msConsole
            .filter((v) => {
                return v[0] === 'error occurred, task canceled'
            })
            .length
        assert.strict.deepEqual({ errs, numCancel }, { errs: ['funGetCurrent must return an array'], numCancel: 2 })
        assert.strict.deepEqual(JSON.stringify(r.msChange).includes('secret-value'), false)
        assertNoDownstream(r.calls)
    })

    //funGetCurrent回傳空陣列(首次執行尚無既有數據)為合法, 維持全數新增
    it('test funGetCurrent回傳[](首次執行): 維持全數新增', async () => {
        let r = await test({ tag: 'f1', retCur: [], useShowLog: false })
        let rr = [
            { type: 'info', event: 'start', msg: 'running...' },
            { type: 'info', event: evGetNew, msg: 'start...' },
            { type: 'info', event: evGetNew, num: 2, msg: 'done' },
            { type: 'info', event: evGetCur, msg: 'start...' },
            { type: 'info', event: evGetCur, num: 0, msg: 'done' },
            { type: 'info', event: 'proc-compare', msg: 'start...' },
            { type: 'info', event: 'proc-compare', numRemove: 0, numAdd: 2, numModify: 0, numSame: 0, msg: 'done' },
            { type: 'info', event: 'proc-add-callfun-add', id: '114115', msg: 'start...' },
            { type: 'info', event: 'proc-add-callfun-add', id: '114115', msg: 'done' },
            { type: 'info', event: 'proc-add-callfun-add', id: '114116', msg: 'start...' },
            { type: 'info', event: 'proc-add-callfun-add', id: '114116', msg: 'done' },
            { type: 'info', event: 'end', msg: 'done' },
        ]
        assert.strict.deepEqual(r.msChange, rr)
        assert.strict.deepEqual(r.msError, [])
        assert.strict.deepEqual(r.calls.add, itemsNew)
        assert.strict.deepEqual({ remove: r.calls.remove, modify: r.calls.modify }, { remove: [], modify: [] })
    })

    //funGetNew回傳空陣列仍為既有之「無數據」取消, 非錯誤(行為不變)
    it('test funGetNew回傳[]: 維持既有之無數據取消, 非錯誤', async () => {
        let r = await test({ tag: 'f2', retNew: [], useShowLog: false })
        let rr = [
            { type: 'info', event: 'start', msg: 'running...' },
            { type: 'info', event: evGetNew, msg: 'start...' },
            { type: 'info', event: evGetNew, num: 0, msg: 'done' },
            { type: 'info', event: evGetCur, msg: 'start...' },
            { type: 'info', event: evGetCur, num: 1, msg: 'done' },
            { type: 'info', event: 'cancel-stage-main', msg: 'no data' },
            { type: 'info', event: 'end', msg: 'done' },
        ]
        assert.strict.deepEqual(r.msChange, rr)
        assert.strict.deepEqual(r.msError, [])
        assertNoDownstream(r.calls)
    })

})
