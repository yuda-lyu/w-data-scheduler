import fs from 'fs'
import w from 'wsemi'
import assert from 'assert'
import fsTaskCp from 'wsemi/src/fsTaskCp.mjs'
import WDataScheduler from '../src/WDataScheduler.mjs'


//規格對應(R-03, 逐項處理之失敗隔離):
//  I1. funRemove、funAdd、funModify任一項失敗(同步拋錯、回傳之Promise被reject, 或其後任務狀態更新失敗)不中止本輪, 其餘項(同階段與其後階段)照常處理, 不發出cancel-stage-main與cancel-stage-beforeEnd
//  I2. 各失敗項發出1筆type為error之change事件與srLog.error紀錄{ event, [keyId], msg: 原錯誤訊息 }, 不發出該項之done
//  I3. 本輪有失敗項時, 逐項處理結束後發出1筆type為warn之fail-items-stage-main事件{ numFail, items, msg: 'some items failed' }, 全部成功時不發
//  I4. funBeforeEnd收到結果物件{ success: { add, modify, remove }, failed: [{ id, mode, event, msg }], msgCancel }, end事件之監聽函數收到同內容, 兩者為各自獨立之副本
//  I5. success只列處理成功之項, 失敗項之任務狀態不記錄; 下輪(使用端僅依success更新既有數據)失敗項仍比對出差異而重試, 修好後成功
//  I6. 結果與warn事件之msg為固定詞彙('funAdd failed'、'funModify failed'、'funRemove failed'、'failed to update task state'), 不含原錯誤訊息
//  I7. 紀錄與輸出通道(srLog.info/warn/error、change監聽函數、console.log)同步拋錯不影響各項之結果與其餘項
//  I8. 階段層級之錯誤(funAfterStart、funGetNew、funGetCurrent、比對)與無數據、無差異維持取消本輪: success與failed皆空, msgCancel為取消訊息; 完成逐項處理者msgCancel為空字串
//  I9. 未提供funAdd等函數時該項視為成功
describe('itemFail', function() {

    this.timeout(30000)

    //fdBase, 本檔臨時資料夾, 各案使用獨立子夾, 測完刪除
    let fdBase = './test/_tmp/itemFail'

    //evRemove, evAdd, evModify, evSum, 預設事件名
    let evRemove = 'proc-remove-callfun-remove'
    let evAdd = 'proc-add-callfun-add'
    let evModify = 'proc-diff-callfun-modify'
    let evSum = 'fail-items-stage-main'

    //evByMode, fixedByMode, 各模式之事件名與固定訊息
    let evByMode = { remove: evRemove, add: evAdd, modify: evModify }
    let fixedByMode = { remove: 'funRemove failed', add: 'funAdd failed', modify: 'funModify failed' }
    let msgState = 'failed to update task state'

    //ids, 各模式依處理順序之id(remove與modify依funGetCurrent之順序, add依funGetNew之順序)
    let ids = {
        remove: ['r1', 'r2', 'r3'],
        add: ['a1', 'a2', 'a3'],
        modify: ['m1', 'm2', 'm3'],
    }

    //genItem, 各筆之hash依id與版本相異
    let genItem = (id, ver = 'v1') => {
        return { id, hash: `h-${id}-${ver}` }
    }

    //genCur, 既有數據, 順序與funGetNew刻意相異, 另含2筆未變更
    let genCur = () => {
        return ['r1', 'm1', 'r2', 's1', 'm2', 'r3', 'm3', 's2'].map((id) => genItem(id, 'v1'))
    }

    //genNew, 最新數據, 新增a1~a3, 變更m1~m3(版本v2), 刪除r1~r3
    let genNew = () => {
        return ['a1', 'm3', 's1', 'a2', 'm1', 's2', 'a3', 'm2'].map((id) => genItem(id, id.startsWith('m') ? 'v2' : 'v1'))
    }

    //rmTime, 移除紀錄內之執行時間欄位
    let rmTime = (v) => {
        let r = { ...v }
        delete r.timeRunStart
        delete r.timeRunEnd
        delete r.timeRunSpent
        return r
    }

    //clone, 保留undefined
    let clone = (v) => {
        return v === undefined ? undefined : structuredClone(v)
    }

    //run, 執行一次偵測
    let run = async(o = {}) => {

        let tag = o.tag
        let keyId = o.keyId || 'id'
        let fail = o.fail || {}

        let fdTagRemove = `${fdBase}/${tag}/tagRemove`
        let fdTaskCpActualSrc = `${fdBase}/${tag}/taskCpActualSrc`
        let fdTaskCpSrc = `${fdBase}/${tag}/taskCpSrc`
        if (!o.keep) {
            w.fsCleanFolder(`${fdBase}/${tag}`)
        }
        w.fsCreateFolder(fdTagRemove)
        w.fsCreateFolder(fdTaskCpActualSrc)
        w.fsCreateFolder(fdTaskCpSrc)
        if (o.prepare) {
            o.prepare({ fdTagRemove, fdTaskCpActualSrc, fdTaskCpSrc })
        }

        let pm = w.genPm()
        let calls = []
        let msChange = []
        let msInfo = []
        let msWarn = []
        let msError = []
        let msConsole = []
        let before = []

        //funOf, 依o.fail指定之id與形式令其失敗
        let funOf = (mode) => {
            return (v) => {
                let id = v[keyId]
                calls.push(`${mode}:${id}`)
                let kind = fail[mode] ? fail[mode][id] : undefined
                if (kind === 'sync') {
                    throw new Error(`secret-${mode}-${id}`)
                }
                if (kind === 'string') {
                    throw `secret-${mode}-${id}` //eslint-disable-line no-throw-literal
                }
                if (kind === 'reject') {
                    return Promise.reject(new Error(`secret-${mode}-${id}`))
                }
                if (kind === 'undefined') {
                    return Promise.reject(undefined) //eslint-disable-line prefer-promise-reject-errors
                }
                //poison, 函數本身成功但使該項無法序列化, 令其後之任務狀態更新失敗
                if (o.poison && o.poison[mode] === id) {
                    v.big = 10n
                }
                //rekey, 函數改動所收資料之主鍵
                if (o.rekey && o.rekey[mode] === id) {
                    v[keyId] = `changed-${id}`
                }
                return Promise.resolve()
            }
        }

        //broken, 通道失效之判斷函數(回傳true者拋錯)
        let broken = o.broken || {}
        let boom = (name, v) => {
            if (broken[name] && broken[name](v)) {
                throw new Error(`channel ${name} broken`)
            }
        }

        let srLog = {
            info: (v) => {
                msInfo.push({ ...v })
                boom('info', v)
            },
            warn: (v) => {
                msWarn.push({ ...v })
                boom('warn', v)
            },
            error: (v) => {
                msError.push({ ...v })
                boom('error', v)
            },
        }

        let optDS = {
            fdTagRemove,
            fdTaskCpActualSrc,
            fdTaskCpSrc,
            srLog,
            useShowLog: o.useShowLog === true,
            funGetNew: o.funGetNew || (async() => o.nw || genNew()),
            funGetCurrent: o.funGetCurrent || (async() => o.cur || genCur()),
            funBeforeEnd: async(r) => {
                before.push(clone(r))
                if (o.onBeforeEnd) {
                    await o.onBeforeEnd(r)
                }
            },
        }
        if (o.keyId) {
            optDS.keyId = o.keyId
        }
        if (o.noBeforeEnd) {
            delete optDS.funBeforeEnd
        }
        if (!o.noFuns) {
            optDS.funRemove = funOf('remove')
            optDS.funAdd = funOf('add')
            optDS.funModify = funOf('modify')
        }
        if (o.funAfterStart) {
            optDS.funAfterStart = o.funAfterStart
        }
        if (o.timeToleranceRemove) {
            optDS.timeToleranceRemove = o.timeToleranceRemove
        }

        let consoleLogOri = console.log
        console.log = (...args) => {
            msConsole.push(args)
            boom('console', args)
        }
        let endArg
        try {
            let ev = await WDataScheduler(optDS)
            ev.on('change', (msg) => {
                msChange.push(structuredClone(msg))
            })
            if (o.onChange) {
                ev.on('change', o.onChange)
            }
            ev.on('change', (msg) => {
                boom('listener', msg)
            })
            ev.on('end', (r) => {
                endArg = clone(r)
                pm.resolve()
            })
            await pm
        }
        finally {
            console.log = consoleLogOri
        }

        //state, 任務狀態紀錄(僅成功處理者應被記錄)
        let otkActual = fsTaskCp(fdTaskCpActualSrc, fdTaskCpActualSrc).buildSrc()
        let otk = fsTaskCp(fdTaskCpSrc, fdTaskCpSrc).buildSrc()
        let has = (o2, id) => {
            return o2.get(id) !== ''
        }
        let state = {
            actual: (id) => has(otkActual, id),
            trigger: (id) => has(otk, id),
        }

        return { calls, msChange: msChange.map(rmTime), msInfo: msInfo.map(rmTime), msWarn, msError, msConsole, before, endArg, state }
    }

    after(() => {
        w.fsDeleteFolder(fdBase)
    })

    //allCalls, 全部9項依處理階段順序(remove、add、modify)之呼叫
    let allCalls = () => {
        return ['remove', 'add', 'modify'].flatMap((mode) => ids[mode].map((id) => `${mode}:${id}`))
    }

    //recOf, 失敗項之紀錄
    let recOf = (mode, id, msg = null) => {
        return { id, mode, event: evByMode[mode], msg: msg === null ? fixedByMode[mode] : msg }
    }

    //expectResult, 依失敗項清單推得結果
    let expectResult = (failed = [], msgCancel = '') => {
        let isFail = (mode, id) => failed.some((v) => v.mode === mode && v.id === id)
        let success = {}
        for (let mode of ['add', 'modify', 'remove']) {
            success[mode] = ids[mode].filter((id) => !isFail(mode, id))
        }
        return { success, failed, msgCancel }
    }

    //itemErrors, change事件內之逐項錯誤
    let itemErrors = (r) => {
        return r.msChange.filter((v) => v.type === 'error')
    }

    //assertIsolated, I1~I4之共同斷言
    let assertIsolated = (r, failed, rawMsgs) => {

        //I1, 全部9項皆被呼叫, 無取消事件
        assert.strict.deepEqual(r.calls, allCalls())
        assert.strict.deepEqual(r.msChange.filter((v) => String(v.event).startsWith('cancel-')), [])

        //I2, 各失敗項1筆error事件(原錯誤訊息), 同時記錄於srLog.error, 且無該項之done
        let errs = failed.map((v, i) => {
            return { type: 'error', event: v.event, id: v.id, msg: rawMsgs[i] }
        })
        assert.strict.deepEqual(itemErrors(r), errs)
        assert.strict.deepEqual(r.msError, errs.map((v) => {
            return { event: v.event, id: v.id, msg: v.msg }
        }))
        for (let v of failed) {
            assert.ok(!r.msChange.some((m) => m.event === v.event && m.id === v.id && m.msg === 'done'), `no done for failed item ${v.id}`)
        }
        //I2, 成功項皆有done
        let ok = expectResult(failed).success
        for (let mode of ['add', 'modify', 'remove']) {
            for (let id of ok[mode]) {
                assert.ok(r.msChange.some((m) => m.event === evByMode[mode] && m.id === id && m.msg === 'done'), `done for ${id}`)
            }
        }

        //I3
        let sums = r.msChange.filter((v) => v.event === evSum)
        let sum = failed.length === 0 ? [] : [{ type: 'warn', event: evSum, numFail: failed.length, items: failed, msg: 'some items failed' }]
        assert.strict.deepEqual(sums, sum)
        assert.strict.deepEqual(r.msWarn, sum.map((v) => {
            return { event: v.event, numFail: v.numFail, items: v.items, msg: v.msg }
        }))

        //I4
        assert.strict.deepEqual(r.before, [expectResult(failed)])
        assert.strict.deepEqual(r.endArg, expectResult(failed))

        //I6, 固定詞彙不含原錯誤訊息
        assert.ok(!JSON.stringify([r.before, r.endArg, sums]).includes('secret'), 'no raw message in result')

    }

    //I1, 壞項在前/中/後, 三個階段各一
    for (let mode of ['remove', 'add', 'modify']) {
        for (let pos of [0, 1, 2]) {
            let id = ids[mode][pos]
            let posName = ['前', '中', '後'][pos]
            it(`${mode}階段壞項在${posName}(${id}): 其餘8項照常處理, 結果列出成功與失敗`, async function() {
                let kind = ['sync', 'reject', 'sync'][pos]
                let r = await run({ tag: `p_${mode}_${pos}`, fail: { [mode]: { [id]: kind } } })
                assertIsolated(r, [recOf(mode, id)], [`secret-${mode}-${id}`])
                //I5, 失敗項之任務狀態未記錄, 成功項已記錄(remove自始未記錄, 故僅驗add與modify)
                for (let m of ['add', 'modify']) {
                    for (let x of ids[m]) {
                        let ok = !(m === mode && x === id)
                        assert.strict.deepEqual([x, r.state.actual(x), r.state.trigger(x)], [x, ok, ok])
                    }
                }
            })
        }
    }

    //I1, 完整事件序列(多個壞項, 跨階段)
    it('多個壞項(r2於remove, m1於modify): 完整事件序列, 其後各項照常, 取消事件不出現', async function() {
        let r = await run({ tag: 'seq', fail: { remove: { r2: 'reject' }, modify: { m1: 'reject' } } })
        let info = (event, o) => ({ type: 'info', event, ...o })
        let item = (event, id) => [info(event, { id, msg: 'start...' }), info(event, { id, msg: 'done' })]
        let itemNg = (event, id, mode) => [info(event, { id, msg: 'start...' }), { type: 'error', event, id, msg: `secret-${mode}-${id}` }]
        let failed = [recOf('remove', 'r2'), recOf('modify', 'm1')]
        let rr = [
            info('start', { msg: 'running...' }),
            info('proc-callfun-getNew', { msg: 'start...' }),
            info('proc-callfun-getNew', { num: 8, msg: 'done' }),
            info('proc-callfun-getCurrent', { msg: 'start...' }),
            info('proc-callfun-getCurrent', { num: 8, msg: 'done' }),
            info('proc-compare', { msg: 'start...' }),
            info('proc-compare', { numRemove: 3, numAdd: 3, numModify: 3, numSame: 2, msg: 'done' }),
            ...item(evRemove, 'r1'),
            ...itemNg(evRemove, 'r2', 'remove'),
            ...item(evRemove, 'r3'),
            ...item(evAdd, 'a1'),
            ...item(evAdd, 'a2'),
            ...item(evAdd, 'a3'),
            ...itemNg(evModify, 'm1', 'modify'),
            ...item(evModify, 'm2'),
            ...item(evModify, 'm3'),
            { type: 'warn', event: evSum, numFail: 2, items: failed, msg: 'some items failed' },
            info('proc-callfun-beforeEnd', { msg: 'start...' }),
            info('proc-callfun-beforeEnd', { msg: 'done' }),
            info('end', { msg: 'done' }),
        ]
        assert.strict.deepEqual(r.msChange, rr)
        assertIsolated(r, failed, ['secret-remove-r2', 'secret-modify-m1'])
    })

    it('多個壞項(各階段皆有, 含連續兩項): 其餘照常, 結果依處理順序列出', async function() {
        let fail = { remove: { r1: 'sync', r2: 'reject' }, add: { a3: 'sync' }, modify: { m2: 'reject', m3: 'sync' } }
        let r = await run({ tag: 'multi', fail })
        let failed = [recOf('remove', 'r1'), recOf('remove', 'r2'), recOf('add', 'a3'), recOf('modify', 'm2'), recOf('modify', 'm3')]
        assertIsolated(r, failed, ['secret-remove-r1', 'secret-remove-r2', 'secret-add-a3', 'secret-modify-m2', 'secret-modify-m3'])
    })

    it('全部9項失敗: 仍逐項呼叫, success全空, 結束前階段照常', async function() {
        let fail = {}
        let failed = []
        let raws = []
        for (let mode of ['remove', 'add', 'modify']) {
            fail[mode] = {}
            for (let id of ids[mode]) {
                fail[mode][id] = 'reject'
                failed.push(recOf(mode, id))
                raws.push(`secret-${mode}-${id}`)
            }
        }
        let r = await run({ tag: 'all', fail })
        assertIsolated(r, failed, raws)
        assert.strict.deepEqual(r.endArg.success, { add: [], modify: [], remove: [] })
        for (let id of [...ids.add, ...ids.modify]) {
            assert.strict.deepEqual([id, r.state.actual(id), r.state.trigger(id)], [id, false, false])
        }
    })

    it('非Error之失敗形式(同步throw字串、reject undefined): 其餘照常, 固定訊息', async function() {
        let r = await run({ tag: 'nonerr', fail: { remove: { r3: 'undefined' }, add: { a1: 'string' }, modify: { m2: 'undefined' } } })
        let failed = [recOf('remove', 'r3'), recOf('add', 'a1'), recOf('modify', 'm2')]
        assertIsolated(r, failed, ['', 'secret-add-a1', ''])
    })

    //I1, 非同步函數延遲後才reject
    it('funAdd為async函數且await後拋錯: 其後各項照常', async function() {
        let calls = []
        let msChange = []
        let endArg
        let pm = w.genPm()
        w.fsCleanFolder(`${fdBase}/late`)
        let ev = await WDataScheduler({
            fdTagRemove: `${fdBase}/late/tagRemove`,
            fdTaskCpActualSrc: `${fdBase}/late/taskCpActualSrc`,
            fdTaskCpSrc: `${fdBase}/late/taskCpSrc`,
            useShowLog: false,
            funGetNew: async() => genNew(),
            funGetCurrent: async() => genCur(),
            funAdd: async(v) => {
                calls.push(`add:${v.id}`)
                await new Promise((resolve) => setImmediate(resolve))
                if (v.id === 'a1') {
                    throw new Error('secret-late')
                }
            },
            funModify: async(v) => {
                calls.push(`modify:${v.id}`)
            },
            funRemove: async(v) => {
                calls.push(`remove:${v.id}`)
            },
        })
        ev.on('change', (msg) => msChange.push({ ...msg }))
        ev.on('end', (r) => {
            endArg = r
            pm.resolve()
        })
        await pm
        assert.strict.deepEqual(calls, allCalls())
        assert.strict.deepEqual(endArg, expectResult([recOf('add', 'a1')]))
        assert.strict.deepEqual(msChange.filter((v) => v.type === 'error').map((v) => v.msg), ['secret-late'])
    })

    //I1, I6, 任務狀態更新失敗(funAdd成功而其後寫入任務狀態失敗)
    for (let [mode, id] of [['add', 'a2'], ['modify', 'm2']]) {
        it(`${mode}階段任務狀態更新失敗(${id}處理後無法序列化): 記為失敗, 其後各項照常`, async function() {
            let r = await run({ tag: `state_${mode}`, poison: { [mode]: id } })
            assert.strict.deepEqual(r.calls, allCalls())
            let failed = [recOf(mode, id, msgState)]
            assert.strict.deepEqual(r.endArg, expectResult(failed))
            assert.strict.deepEqual(r.before, [expectResult(failed)])
            assert.strict.deepEqual(itemErrors(r).map((v) => [v.event, v.id]), [[evByMode[mode], id]])
            assert.ok(itemErrors(r)[0].msg.includes('BigInt'), 'error event keeps the original message')
            assert.strict.deepEqual(r.msChange.filter((v) => v.event === evSum).map((v) => v.items), [failed])
            assert.strict.deepEqual([r.state.actual(id), r.state.trigger(id)], [false, false])
            assert.strict.deepEqual(r.msChange.filter((v) => String(v.event).startsWith('cancel-')), [])
        })
    }

    it('刪除防抖下新增刪除tag失敗(該id之tag路徑為資料夾): 記為失敗, 其後各項照常', async function() {
        let r = await run({
            tag: 'state_remove',
            timeToleranceRemove: 60 * 1000,
            prepare: ({ fdTagRemove }) => {
                fs.mkdirSync(`${fdTagRemove}/r2`)
            },
        })
        assert.strict.deepEqual(r.calls, allCalls())
        let failed = [recOf('remove', 'r2', msgState)]
        assert.strict.deepEqual(r.endArg, expectResult(failed))
        assert.strict.deepEqual(itemErrors(r).map((v) => [v.event, v.id]), [[evRemove, 'r2']])
        assert.strict.deepEqual(r.msChange.filter((v) => v.event === evRemove && v.msg === 'add-tag').map((v) => v.id), ['r1', 'r3'])
        assert.strict.deepEqual(r.msChange.filter((v) => String(v.event).startsWith('cancel-')), [])
    })

    it('刪除防抖下刪除成功: 列入success.remove', async function() {
        let r = await run({ tag: 'debounce_ok', timeToleranceRemove: 60 * 1000, fail: { remove: { r1: 'reject' } } })
        assert.strict.deepEqual(r.endArg, expectResult([recOf('remove', 'r1')]))
        assert.strict.deepEqual(r.msChange.filter((v) => v.event === evRemove && v.msg === 'add-tag').map((v) => v.id), ['r2', 'r3'])
    })

    //I4, 刪除防抖下前輪已標記之刪除項再次處理, 仍列入success.remove
    it('刪除防抖下已有刪除tag之項再次處理: 列入success.remove', async function() {
        await run({ tag: 'tagged', timeToleranceRemove: 60 * 1000 })
        let r = await run({ tag: 'tagged', keep: true, timeToleranceRemove: 60 * 1000 })
        assert.strict.deepEqual(r.calls.filter((v) => v.startsWith('remove:')), ['remove:r1', 'remove:r2', 'remove:r3'])
        assert.strict.deepEqual(r.msChange.filter((v) => v.event === evRemove && v.msg === 'add-tag'), [])
        assert.strict.deepEqual(r.endArg.success.remove, ['r1', 'r2', 'r3'])
        assert.strict.deepEqual(r.endArg.failed, [])
    })

    //I3, I4, I8, 全部成功
    it('全部成功: success列出全部, failed空, msgCancel空, 不發warn事件', async function() {
        let r = await run({ tag: 'ok' })
        assertIsolated(r, [], [])
    })

    //I9
    it('未提供funAdd、funModify、funRemove: 各項視為成功', async function() {
        let r = await run({ tag: 'nofuns', noFuns: true })
        assert.strict.deepEqual(r.calls, [])
        assert.strict.deepEqual(r.endArg, expectResult([]))
    })

    //I4, 自訂主鍵
    it('自訂keyId: success與failed之id為該主鍵之值', async function() {
        let cv = (v) => {
            return { name: v.id, hash: v.hash }
        }
        let r = await run({ tag: 'keyid', keyId: 'name', cur: genCur().map(cv), nw: genNew().map(cv), fail: { add: { a2: 'reject' } } })
        assert.strict.deepEqual(r.endArg, expectResult([recOf('add', 'a2')]))
        assert.strict.deepEqual(r.before, [expectResult([recOf('add', 'a2')])])
        assert.strict.deepEqual(itemErrors(r), [{ type: 'error', event: evAdd, name: 'a2', msg: 'secret-add-a2' }])
    })

    //I4, 主鍵取自呼叫使用端函數前
    it('funAdd、funModify、funRemove改動所收資料之主鍵: 結果與紀錄仍為原主鍵值', async function() {
        let r = await run({ tag: 'rekey', rekey: { add: 'a1', modify: 'm2', remove: 'r3' } })
        assert.strict.deepEqual(r.endArg, expectResult([]))
        assert.strict.deepEqual(r.msChange.filter((v) => v.msg === 'done' && v.id !== undefined).map((v) => v.id), [...ids.remove, ...ids.add, ...ids.modify])
    })

    //I4, 未提供funBeforeEnd時end事件仍帶結果
    it('未提供funBeforeEnd: end事件之監聽函數仍收到結果', async function() {
        let r = await run({ tag: 'noBeforeEnd', noBeforeEnd: true, fail: { add: { a3: 'reject' } } })
        assert.strict.deepEqual(r.before, [])
        assert.strict.deepEqual(r.endArg, expectResult([recOf('add', 'a3')]))
    })

    //I4, 副本獨立
    it('funBeforeEnd改動所收結果: end事件之結果不受影響', async function() {
        let r = await run({
            tag: 'copy',
            fail: { add: { a2: 'reject' } },
            onBeforeEnd: (res) => {
                res.success.add.push('zzz')
                res.success.remove.length = 0
                res.failed[0].msg = 'changed'
                res.failed.push({ id: 'zzz' })
                res.msgCancel = 'changed'
            },
        })
        assert.strict.deepEqual(r.endArg, expectResult([recOf('add', 'a2')]))
        assert.strict.deepEqual(r.msChange.filter((v) => v.event === evSum).map((v) => v.items), [[recOf('add', 'a2')]])
    })

    it('warn事件之監聽函數改動所收items: funBeforeEnd與end之結果不受影響', async function() {
        let r = await run({
            tag: 'copyEvent',
            fail: { add: { a2: 'reject' } },
            onChange: (msg) => {
                if (msg.event === evSum) {
                    msg.items[0].msg = 'changed'
                    msg.items.push({ id: 'zzz' })
                }
            },
        })
        assert.strict.deepEqual(r.before, [expectResult([recOf('add', 'a2')])])
        assert.strict.deepEqual(r.endArg, expectResult([recOf('add', 'a2')]))
    })

    it('funBeforeEnd拋錯: end事件之監聽函數仍收到結果, 結束前階段維持取消紀錄', async function() {
        let r = await run({
            tag: 'beforeEndErr',
            fail: { modify: { m1: 'reject' } },
            onBeforeEnd: () => {
                throw new Error('before-end broken')
            },
        })
        assert.strict.deepEqual(r.endArg, expectResult([recOf('modify', 'm1')]))
        assert.strict.deepEqual(r.msChange.filter((v) => v.event === 'cancel-stage-beforeEnd').map((v) => v.msg), ['error at proc-callfun-beforeEnd'])
    })

    //I5, 下輪重試; 使用端僅依success更新既有數據
    it('失敗項下輪重試: 仍有差異者才重做, 修好後成功, 其後無差異', async function() {
        let store = new Map(genCur().map((v) => [v.id, v]))
        let nw = genNew()
        let apply = (res) => {
            for (let id of [...res.success.add, ...res.success.modify]) {
                store.set(id, nw.find((v) => v.id === id))
            }
            for (let id of res.success.remove) {
                store.delete(id)
            }
        }
        let round = async(fail, first = false) => {
            return run({
                tag: 'retry',
                keep: !first,
                fail,
                nw,
                funGetCurrent: async() => Array.from(store.values()),
                onBeforeEnd: apply,
            })
        }

        //第1輪: r2、a2、m2失敗
        let r1 = await round({ remove: { r2: 'reject' }, add: { a2: 'sync' }, modify: { m2: 'reject' } }, true)
        let failed1 = [recOf('remove', 'r2'), recOf('add', 'a2'), recOf('modify', 'm2')]
        assert.strict.deepEqual(r1.endArg, expectResult(failed1))

        //第2輪: r2與m2修好, a2仍失敗, 只重做3個未完成項
        let r2 = await round({ add: { a2: 'reject' } })
        assert.strict.deepEqual(r2.calls, ['remove:r2', 'add:a2', 'modify:m2'])
        assert.strict.deepEqual(r2.endArg, { success: { add: [], modify: ['m2'], remove: ['r2'] }, failed: [recOf('add', 'a2')], msgCancel: '' })
        assert.strict.deepEqual(r2.state.actual('a2'), false)

        //第3輪: a2修好
        let r3 = await round({})
        assert.strict.deepEqual(r3.calls, ['add:a2'])
        assert.strict.deepEqual(r3.endArg, { success: { add: ['a2'], modify: [], remove: [] }, failed: [], msgCancel: '' })
        assert.strict.deepEqual([r3.state.actual('a2'), r3.state.trigger('a2')], [true, true])
        assert.strict.deepEqual(r3.msChange.filter((v) => v.event === evSum), [])

        //第4輪: 無差異
        let r4 = await round({})
        assert.strict.deepEqual(r4.calls, [])
        assert.strict.deepEqual(r4.endArg, { success: { add: [], modify: [], remove: [] }, failed: [], msgCancel: 'no difference' })
    })

    //I7, 紀錄與輸出通道失效
    let isItem = (v) => v.id !== undefined
    let channels = [
        { name: 'srLog.info於逐項事件拋錯', broken: { info: isItem }, fail: { add: { a2: 'reject' } } },
        { name: 'srLog.error拋錯', broken: { error: () => true }, fail: { add: { a1: 'reject' } } },
        { name: 'srLog.error拋錯且任務狀態更新失敗', broken: { error: () => true }, fail: {}, stateFail: true },
        { name: 'srLog.warn拋錯', broken: { warn: () => true }, fail: { remove: { r1: 'reject' } } },
        { name: 'change監聽函數於逐項事件拋錯', broken: { listener: isItem }, fail: { modify: { m1: 'reject' } } },
        { name: 'change監聽函數於彙總事件拋錯', broken: { listener: (v) => v.event === evSum }, fail: { modify: { m1: 'reject' } } },
        { name: 'console.log拋錯(useShowLog)', broken: { console: () => true }, fail: { remove: { r1: 'reject' } }, useShowLog: true },
        { name: '各通道同時失效', broken: { info: isItem, error: () => true, warn: () => true, listener: (v) => isItem(v) || v.event === evSum, console: () => true }, fail: { remove: { r2: 'reject' }, add: { a2: 'sync' } }, useShowLog: true },
    ]
    channels.forEach((c, k) => {
        it(`${c.name}: 各項結果與其餘項照常`, async function() {
            let poison = c.stateFail ? { add: 'a1' } : undefined
            let r = await run({ tag: `ch${k}`, broken: c.broken, fail: c.fail, useShowLog: c.useShowLog, poison })
            assert.strict.deepEqual(r.calls, allCalls())
            let failed = []
            for (let mode of ['remove', 'add', 'modify']) {
                for (let id of ids[mode]) {
                    if (c.fail[mode] && c.fail[mode][id]) {
                        failed.push(recOf(mode, id))
                    }
                    else if (c.stateFail && id === 'a1') {
                        failed.push(recOf(mode, id, msgState))
                    }
                }
            }
            assert.strict.deepEqual(r.endArg, expectResult(failed))
            assert.strict.deepEqual(r.before, [expectResult(failed)])
        })
    })

    //useShowLog為true時, 失敗項之錯誤輸出至console, 不輸出取消訊息
    it('useShowLog為true: 各失敗項之錯誤輸出至console, 不輸出task canceled', async function() {
        let r = await run({ tag: 'show', useShowLog: true, fail: { remove: { r1: 'reject' }, add: { a2: 'sync' } } })
        let errs = r.msConsole.filter((v) => v[0] instanceof Error).map((v) => v[0].message)
        assert.strict.deepEqual(errs, ['secret-remove-r1', 'secret-add-a2'])
        assert.strict.deepEqual(r.msConsole.length, 2)
    })

    //I8, 階段層級之錯誤與取消
    let stageCases = [
        {
            name: 'funAfterStart拋錯',
            opt: {
                funAfterStart: async() => {
                    throw new Error('after-start broken')
                },
            },
            msgCancel: 'error at proc-callfun-afterStart',
        },
        {
            name: 'funGetNew拋錯',
            opt: {
                funGetNew: async() => {
                    throw new Error('get-new broken')
                },
            },
            msgCancel: 'error at proc-callfun-getNew',
        },
        {
            name: 'funGetCurrent回傳非陣列',
            opt: { funGetCurrent: async() => null },
            msgCancel: 'error at proc-callfun-getCurrent',
        },
        {
            name: '比對拋錯',
            opt: {
                funGetNew: async() => [{
                    get id() {
                        throw new Error('id broken')
                    },
                    hash: 'x',
                }],
            },
            msgCancel: 'error at proc-compare',
        },
        {
            name: 'funGetNew回傳空陣列(無數據)',
            opt: { funGetNew: async() => [] },
            msgCancel: 'no data',
        },
        {
            name: '無差異',
            opt: { cur: genNew() },
            msgCancel: 'no difference',
        },
    ]
    stageCases.forEach((c, k) => {
        it(`${c.name}: 本輪不處理任何項, success與failed皆空, msgCancel為取消訊息`, async function() {
            let r = await run({ tag: `stage${k}`, ...c.opt })
            let rr = { success: { add: [], modify: [], remove: [] }, failed: [], msgCancel: c.msgCancel }
            assert.strict.deepEqual(r.calls, [])
            assert.strict.deepEqual(r.before, [rr])
            assert.strict.deepEqual(r.endArg, rr)
            assert.strict.deepEqual(r.msChange.filter((v) => v.event === evSum), [])
        })
    })

})
