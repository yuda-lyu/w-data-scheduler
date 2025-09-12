import fs from 'fs'
import _ from 'lodash-es'
import w from 'wsemi'
import assert from 'assert'
import WDataScheduler from '../src/WDataScheduler.mjs'


describe('timer', function() {

    let test = async() => {

        let pmm = w.genPm()

        let ms = []

        //fdTagRemove
        let fdTagRemove = './_timer_tagRemove'
        w.fsCleanFolder(fdTagRemove)

        //fdTaskCpActualSrc
        let fdTaskCpActualSrc = './_timer_taskCpActualSrc'
        w.fsCleanFolder(fdTaskCpActualSrc)

        //fdTaskCpSrc
        let fdTaskCpSrc = './_timer_taskCpSrc'
        w.fsCleanFolder(fdTaskCpSrc)

        let items1 = [
            {
                'id': '114115',
                'tag': '2025082116374751115',
                'number': '115',
                'time': '2025-08-21T16:37:47+08:00',
                'timeRec': '2025-08-21 16:37:47',
                'timeTag': '20250821163747',
                'ml': '5.1',
            },
        ]

        let items2 = [ //add
            {
                'id': '114115',
                'tag': '2025082116374751115',
                'number': '115',
                'time': '2025-08-21T16:37:47+08:00',
                'timeRec': '2025-08-21 16:37:47',
                'timeTag': '20250821163747',
                'ml': '5.1',
            },
            {
                'id': '114116',
                'tag': '2025082214061554116',
                'number': '116',
                'time': '2025-08-22T14:06:15+08:00',
                'timeRec': '2025-08-22 14:06:15',
                'timeTag': '20250822140615',
                'ml': '5.4',
            },
        ]

        let items3 = [ //modify
            {
                'id': '114115',
                'tag': '2025082116374751115',
                'number': '115',
                'time': '2025-08-21T16:37:47+08:00',
                'timeRec': '2025-08-21 16:37:47',
                'timeTag': '20250821163747',
                'ml': '5.1',
            },
            {
                'id': '114116',
                'tag': '2025082214061554116',
                'number': '116',
                'time': '2025-08-22T14:06:15+08:00',
                'timeRec': '2025-08-22 14:06:15',
                'timeTag': '20250822140615',
                'ml': '6.0',
            },
        ]

        let items4 = [ //remove
            {
                'id': '114115',
                'tag': '2025082116374751115',
                'number': '115',
                'time': '2025-08-21T16:37:47+08:00',
                'timeRec': '2025-08-21 16:37:47',
                'timeTag': '20250821163747',
                'ml': '5.1',
            },
        ]

        let items5 = [ //add
            {
                'id': '114115',
                'tag': '2025082116374751115',
                'number': '115',
                'time': '2025-08-21T16:37:47+08:00',
                'timeRec': '2025-08-21 16:37:47',
                'timeTag': '20250821163747',
                'ml': '5.1',
            },
            {
                'id': '114116',
                'tag': '2025082214061554116',
                'number': '116',
                'time': '2025-08-22T14:06:15+08:00',
                'timeRec': '2025-08-22 14:06:15',
                'timeTag': '20250822140615',
                'ml': '6.0',
            },
        ]

        let items6 = [ //remove
            {
                'id': '114115',
                'tag': '2025082116374751115',
                'number': '115',
                'time': '2025-08-21T16:37:47+08:00',
                'timeRec': '2025-08-21 16:37:47',
                'timeTag': '20250821163747',
                'ml': '5.1',
            },
        ]

        let items7 = [ //add, 等超過容許值再add
            {
                'id': '114115',
                'tag': '2025082116374751115',
                'number': '115',
                'time': '2025-08-21T16:37:47+08:00',
                'timeRec': '2025-08-21 16:37:47',
                'timeTag': '20250821163747',
                'ml': '5.1',
            },
            {
                'id': '114116',
                'tag': '2025082214061554116',
                'number': '116',
                'time': '2025-08-22T14:06:15+08:00',
                'timeRec': '2025-08-22 14:06:15',
                'timeTag': '20250822140615',
                'ml': '6.0',
            },
        ]

        let itemsOld = []

        let trgs = [
            {
                stage: '1.ini',
                delay: 0,
                items: items1,
            },
            {
                stage: '2.add',
                delay: 2000,
                items: items2,
            },
            {
                stage: '3.modify',
                delay: 2000,
                items: items3,
            },
            {
                stage: '4.remove',
                delay: 2000,
                items: items4,
            },
            {
                stage: '5.add',
                delay: 2000,
                items: items5,
            },
            {
                stage: '6.remove',
                delay: 2000,
                items: items6,
            },
            {
                stage: '7.eff-add',
                delay: 6000,
                items: items7,
            },
        ]

        let stage = ''
        let itemsNow = null
        w.pmSeries(trgs, async(trg,) => {
            await w.delay(trg.delay)
            stage = trg.stage
            itemsNow = trg.items
        })

        let run = async() => {
            //console.log('running...')
            let pm = w.genPm()

            //funGetNew
            let funGetNew = async() => {
                return itemsNow
            }

            //funGetCurrent
            let funGetCurrent = async() => {
                return itemsOld
            }

            //funRemove
            let funRemove = async(v) => {
                //do somethings
            }

            //funAdd
            let funAdd = async(v) => {
                //do somethings
            }

            //funModify
            let funModify = async(v) => {
                //do somethings
            }

            //funBeforeEnd
            let funBeforeEnd = async(v) => {
                itemsOld = itemsNow
            }

            let opt = {
                fdTagRemove,
                fdTaskCpActualSrc,
                fdTaskCpSrc,
                funGetNew,
                funGetCurrent,
                funRemove,
                funAdd,
                funModify,
                funBeforeEnd,
                timeToleranceRemove: 4 * 1000, //4s
            }
            let ev = await WDataScheduler(opt)
                .catch((err) => {
                    console.log(err)
                })
            ev.on('change', (msg) => {
                delete msg.type
                delete msg.timeRunStart
                delete msg.timeRunEnd
                delete msg.timeRunSpent
                if (w.arrHas(msg.event, [
                    'start',
                    'proc-callfun-download',
                    'proc-callfun-getCurrent',
                    'compare',
                    'proc-callfun-beforeEnd',
                ])) {
                    return
                }
                ms.push({ stage, ...msg, })
                //console.log('change', msg)
            })
            ev.on('end', () => {
                //console.log('run end')
                pm.resolve()
            })

            return pm
        }


        let lock = false
        let tr = setInterval(() => {

            if (lock) {
                return
            }
            lock = true

            run()
                .finally(() => {
                    lock = false
                })

        }, 1000)

        let n = -1
        let tt = setInterval(async() => {
            n++
            //console.log('n', n, `stage[${stage}]`)
            if (n >= 18) {

                clearInterval(tt)
                clearInterval(tr)

                await w.waitFun(() => {
                    return !lock
                })

                w.fsDeleteFolder(fdTagRemove)
                w.fsDeleteFolder(fdTaskCpActualSrc)
                w.fsDeleteFolder(fdTaskCpSrc)

                // console.log('ms', ms)
                pmm.resolve(ms)
            }
        }, 1000)

        return pmm
    }
    let ms = [
        { stage: '1.ini', event: 'proc-callfun-getNew', msg: 'start...' },
        { stage: '1.ini', event: 'proc-callfun-getNew', num: 1, msg: 'done' },
        {
            stage: '1.ini',
            event: 'proc-add-callfun-add',
            id: '114115',
            msg: 'start...'
        },
        {
            stage: '1.ini',
            event: 'proc-add-callfun-add',
            id: '114115',
            msg: 'done'
        },
        { stage: '1.ini', event: 'end', msg: 'done' },
        { stage: '2.add', event: 'proc-callfun-getNew', msg: 'start...' },
        { stage: '2.add', event: 'proc-callfun-getNew', num: 2, msg: 'done' },
        {
            stage: '2.add',
            event: 'proc-add-callfun-add',
            id: '114116',
            msg: 'start...'
        },
        {
            stage: '2.add',
            event: 'proc-add-callfun-add',
            id: '114116',
            msg: 'done'
        },
        { stage: '2.add', event: 'end', msg: 'done' },
        { stage: '3.modify', event: 'proc-callfun-getNew', msg: 'start...' },
        {
            stage: '3.modify',
            event: 'proc-callfun-getNew',
            num: 2,
            msg: 'done'
        },
        {
            stage: '3.modify',
            event: 'proc-diff-callfun-modify',
            id: '114116',
            msg: 'start...'
        },
        {
            stage: '3.modify',
            event: 'proc-diff-callfun-modify',
            id: '114116',
            msg: 'done'
        },
        { stage: '3.modify', event: 'end', msg: 'done' },
        { stage: '4.remove', event: 'proc-callfun-getNew', msg: 'start...' },
        {
            stage: '4.remove',
            event: 'proc-callfun-getNew',
            num: 1,
            msg: 'done'
        },
        {
            stage: '4.remove',
            event: 'proc-remove-callfun-remove',
            id: '114116',
            msg: 'start...'
        },
        {
            stage: '4.remove',
            event: 'proc-remove-callfun-remove',
            id: '114116',
            msg: 'tag'
        },
        { stage: '4.remove', event: 'end', msg: 'done' },
        { stage: '5.add', event: 'proc-callfun-getNew', msg: 'start...' },
        { stage: '5.add', event: 'proc-callfun-getNew', num: 2, msg: 'done' },
        {
            stage: '5.add',
            event: 'proc-add-callfun-add',
            id: '114116',
            msg: 'start...'
        },
        {
            stage: '5.add',
            event: 'proc-add-callfun-add',
            id: '114116',
            msg: 'release-tag'
        },
        { stage: '5.add', event: 'end', msg: 'done' },
        { stage: '6.remove', event: 'proc-callfun-getNew', msg: 'start...' },
        {
            stage: '6.remove',
            event: 'proc-callfun-getNew',
            num: 1,
            msg: 'done'
        },
        {
            stage: '6.remove',
            event: 'proc-remove-callfun-remove',
            id: '114116',
            msg: 'start...'
        },
        {
            stage: '6.remove',
            event: 'proc-remove-callfun-remove',
            id: '114116',
            msg: 'tag'
        },
        { stage: '6.remove', event: 'end', msg: 'done' },
        { stage: '6.remove', event: 'proc-callfun-getNew', msg: 'start...' },
        {
            stage: '6.remove',
            event: 'proc-callfun-getNew',
            num: 1,
            msg: 'done'
        },
        { stage: '6.remove', event: 'cancel', msg: 'no difference' },
        { stage: '6.remove', event: 'proc-callfun-getNew', msg: 'start...' },
        {
            stage: '6.remove',
            event: 'proc-callfun-getNew',
            num: 1,
            msg: 'done'
        },
        { stage: '6.remove', event: 'cancel', msg: 'no difference' },
        {
            stage: '7.eff-add',
            event: 'proc-retake-remove',
            id: '114116',
            from: 'debounce',
            msg: 'release-tag'
        },
        {
            stage: '7.eff-add',
            event: 'proc-retake-remove',
            id: '114116',
            from: 'debounce',
            msg: 'done'
        },
        { stage: '7.eff-add', event: 'proc-callfun-getNew', msg: 'start...' },
        {
            stage: '7.eff-add',
            event: 'proc-callfun-getNew',
            num: 2,
            msg: 'done'
        },
        {
            stage: '7.eff-add',
            event: 'proc-add-callfun-add',
            id: '114116',
            msg: 'start...'
        },
        {
            stage: '7.eff-add',
            event: 'proc-add-callfun-add',
            id: '114116',
            msg: 'done'
        },
        { stage: '7.eff-add', event: 'end', msg: 'done' },
        { stage: '7.eff-add', event: 'proc-callfun-getNew', msg: 'start...' },
        {
            stage: '7.eff-add',
            event: 'proc-callfun-getNew',
            num: 2,
            msg: 'done'
        },
        { stage: '7.eff-add', event: 'cancel', msg: 'no difference' }
    ]

    it('test timer', async () => {
        let r = await test()
        let rr = ms
        assert.strict.deepEqual(r, rr)
    })

})
