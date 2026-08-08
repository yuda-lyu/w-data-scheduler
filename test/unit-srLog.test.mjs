import _ from 'lodash-es'
import w from 'wsemi'
import assert from 'assert'
import WDataScheduler from '../src/WDataScheduler.mjs'


describe('srLog', function() {

    //msgErrFunAdd, funAdd拋出之錯誤訊息
    let msgErrFunAdd = 'mock error from funAdd'

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

    //itemsCurrent, 既有數據, 故差異為新增1筆id[114116]
    let itemsCurrent = [
        {
            'id': '114115',
            'hash': 'abc',
        },
    ]

    //rmTime, 移除紀錄內之執行時間欄位
    let rmTime = (v) => {
        let r = { ...v }
        delete r.timeRunStart
        delete r.timeRunEnd
        delete r.timeRunSpent
        return r
    }

    //test, 執行一次偵測並蒐集srLog各函數與change事件所收到之紀錄
    let test = async(opt = {}) => {

        //useSrLog, 是否提供srLog
        let useSrLog = _.get(opt, 'useSrLog', true)

        //keysSrLog, srLog內所提供之函數
        let keysSrLog = _.get(opt, 'keysSrLog', ['info', 'warn', 'error'])

        //errFunAdd, funAdd是否拋錯
        let errFunAdd = _.get(opt, 'errFunAdd', false)

        //tag, 各測試使用獨立資料夾
        let tag = _.get(opt, 'tag', 'c0')

        let pm = w.genPm()

        //msChange, msInfo, msWarn, msError
        let msChange = []
        let msInfo = []
        let msWarn = []
        let msError = []

        //nArgs, 各次呼叫srLog函數所接收之參數數量
        let nArgs = []

        //fdTagRemove
        let fdTagRemove = `./_srLog_${tag}_tagRemove`
        w.fsCleanFolder(fdTagRemove)

        //fdTaskCpActualSrc
        let fdTaskCpActualSrc = `./_srLog_${tag}_taskCpActualSrc`
        w.fsCleanFolder(fdTaskCpActualSrc)

        //fdTaskCpSrc
        let fdTaskCpSrc = `./_srLog_${tag}_taskCpSrc`
        w.fsCleanFolder(fdTaskCpSrc)

        //funGetNew
        let funGetNew = async() => {
            return itemsNew
        }

        //funGetCurrent
        let funGetCurrent = async() => {
            return itemsCurrent
        }

        //funRemove
        let funRemove = async(v) => {
            //do somethings
        }

        //funAdd
        let funAdd = async(v) => {
            if (errFunAdd) {
                throw new Error(msgErrFunAdd)
            }
        }

        //funModify
        let funModify = async(v) => {
            //do somethings
        }

        //srLog
        let srLogAll = {
            info: (...args) => {
                nArgs.push(_.size(args))
                msInfo.push({ ...args[0] })
            },
            warn: (...args) => {
                nArgs.push(_.size(args))
                msWarn.push({ ...args[0] })
            },
            error: (...args) => {
                nArgs.push(_.size(args))
                msError.push({ ...args[0] })
            },
        }
        let srLog = null
        if (useSrLog) {
            srLog = _.pick(srLogAll, keysSrLog)
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

            pm.resolve({ msChange, msInfo, msWarn, msError, nArgs })
        })

        return pm
    }

    //msChangeNormal, 無錯誤時各階段所發送之紀錄
    let msChangeNormal = [
        { type: 'info', event: 'start', msg: 'running...' },
        { type: 'info', event: 'proc-callfun-getNew', msg: 'start...' },
        { type: 'info', event: 'proc-callfun-getNew', num: 2, msg: 'done' },
        { type: 'info', event: 'proc-callfun-getCurrent', msg: 'start...' },
        { type: 'info', event: 'proc-callfun-getCurrent', num: 1, msg: 'done' },
        { type: 'info', event: 'proc-compare', msg: 'start...' },
        {
            type: 'info',
            event: 'proc-compare',
            numRemove: 0,
            numAdd: 1,
            numModify: 0,
            numSame: 1,
            msg: 'done'
        },
        { type: 'info', event: 'proc-add-callfun-add', id: '114116', msg: 'start...' },
        { type: 'info', event: 'proc-add-callfun-add', id: '114116', msg: 'done' },
        { type: 'info', event: 'end', msg: 'done' },
    ]

    //msChangeError, funAdd拋錯時各階段所發送之紀錄
    let msChangeError = [
        { type: 'info', event: 'start', msg: 'running...' },
        { type: 'info', event: 'proc-callfun-getNew', msg: 'start...' },
        { type: 'info', event: 'proc-callfun-getNew', num: 2, msg: 'done' },
        { type: 'info', event: 'proc-callfun-getCurrent', msg: 'start...' },
        { type: 'info', event: 'proc-callfun-getCurrent', num: 1, msg: 'done' },
        { type: 'info', event: 'proc-compare', msg: 'start...' },
        {
            type: 'info',
            event: 'proc-compare',
            numRemove: 0,
            numAdd: 1,
            numModify: 0,
            numSame: 1,
            msg: 'done'
        },
        { type: 'info', event: 'proc-add-callfun-add', id: '114116', msg: 'start...' },
        { type: 'error', event: 'proc-add-callfun-add', id: '114116', msg: msgErrFunAdd },
        { type: 'info', event: 'cancel-stage-main', msg: 'error at proc-add-callfun-add' },
        { type: 'info', event: 'cancel-stage-beforeEnd', msg: 'error at proc-add-callfun-add' },
        { type: 'info', event: 'end', msg: 'done' },
    ]

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

    it('test srLog: 提供info與warn與error時, 各階段事件紀錄於srLog.info', async () => {
        let r = await test({ tag: 'c1' })
        let rr = pickByType(msChangeNormal, 'info')
        assert.strict.deepEqual(r.msInfo.map(rmTime), rr)
    })

    it('test srLog: 提供info與warn與error時, srLog各函數僅接收一紀錄物件', async () => {
        let r = await test({ tag: 'c2' })
        let rr = _.uniq(r.nArgs)
        assert.strict.deepEqual(rr, [1])
    })

    it('test srLog: 提供info與warn與error時, srLog紀錄與change事件內容一致且type為info', async () => {
        let r = await test({ tag: 'c3' })
        let rr = r.msInfo.map((v) => {
            return { type: 'info', ...v }
        })
        assert.strict.deepEqual(r.msChange, rr)
    })

    it('test srLog: 無錯誤時不呼叫srLog.warn與srLog.error', async () => {
        let r = await test({ tag: 'c4' })
        let rr = { numWarn: 0, numError: 0 }
        assert.strict.deepEqual({ numWarn: _.size(r.msWarn), numError: _.size(r.msError) }, rr)
    })

    it('test srLog: funAdd拋錯時, 錯誤紀錄於srLog.error且change事件type為error', async () => {
        let r = await test({ tag: 'c5', errFunAdd: true })
        let rr = pickByType(msChangeError, 'error')
        assert.strict.deepEqual(r.msError, rr)
        assert.strict.deepEqual(pickByType(r.msChange, 'error'), rr)
    })

    it('test srLog: funAdd拋錯時, 後續取消與結束階段仍紀錄於srLog.info', async () => {
        let r = await test({ tag: 'c6', errFunAdd: true })
        let rr = pickByType(msChangeError, 'info')
        assert.strict.deepEqual(r.msInfo.map(rmTime), rr)
    })

    it('test srLog: 僅提供info時, 未提供之error不影響change事件發送', async () => {
        let r = await test({ tag: 'c7', errFunAdd: true, keysSrLog: ['info'] })
        let rr = msChangeError
        assert.strict.deepEqual(r.msChange.map(rmTime), rr)
        assert.strict.deepEqual(r.msInfo.map(rmTime), pickByType(msChangeError, 'info'))
        assert.strict.deepEqual(_.size(r.msError), 0)
    })

    it('test srLog: 未提供srLog時, change事件仍完整發送', async () => {
        let r = await test({ tag: 'c8', errFunAdd: true, useSrLog: false })
        let rr = msChangeError
        assert.strict.deepEqual(r.msChange.map(rmTime), rr)
    })

})
