import fs from 'fs'
import _ from 'lodash-es'
import w from 'wsemi'
import assert from 'assert'
import WDataScheduler from '../src/WDataScheduler.mjs'


describe('once', function() {

    let test = async() => {

        let pm = w.genPm()

        let ms = []

        //fdTagRemove
        let fdTagRemove = './_once_tagRemove'
        w.fsCleanFolder(fdTagRemove)

        //fdTaskCpActualSrc
        let fdTaskCpActualSrc = './_once_taskCpActualSrc'
        w.fsCleanFolder(fdTaskCpActualSrc)

        //fdTaskCpSrc
        let fdTaskCpSrc = './_once_taskCpSrc'
        w.fsCleanFolder(fdTaskCpSrc)

        //funGetNew
        let funGetNew = async() => {
            let items = [
                {
                    'id': '114115',
                    'hash': 'abc',
                },
            ]
            return items
        }

        //funGetCurrent
        let funGetCurrent = async() => {
            let items = [
                {
                    'id': '114115',
                    'hash': 'abc',
                },
                {
                    'id': '114116',
                    'hash': 'def',
                },
            ]
            return items
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

        let opt = {
            fdTagRemove,
            fdTaskCpActualSrc,
            fdTaskCpSrc,
            funGetNew,
            funGetCurrent,
            funRemove,
            funAdd,
            funModify,
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
            // console.log('change', msg)
            ms.push(msg)
        })
        ev.on('end', () => {
            // console.log('ms', ms)
            w.fsDeleteFolder(fdTagRemove)
            w.fsDeleteFolder(fdTaskCpActualSrc)
            w.fsDeleteFolder(fdTaskCpSrc)
            pm.resolve(ms)
        })
        // change { event: 'start', msg: 'running...' }
        // change { event: 'proc-callfun-getNew', msg: 'start...' }
        // change { event: 'proc-callfun-getNew', num: 1, msg: 'done' }
        // change { event: 'proc-callfun-getCurrent', msg: 'start...' }
        // change { event: 'proc-callfun-getCurrent', num: 2, msg: 'done' }
        // change { event: 'compare', msg: 'start...' }
        // change {
        //   event: 'compare',
        //   numRemove: 1,
        //   numAdd: 0,
        //   numModify: 0,
        //   numSame: 1,
        //   msg: 'done'
        // }
        // change { event: 'proc-remove-callfun-remove', id: '114116', msg: 'start...' }
        // change { event: 'proc-remove-callfun-remove', id: '114116', msg: 'done' }
        // change { event: 'end', msg: 'done' }

        return pm
    }
    let ms = [
        { event: 'start', msg: 'running...' },
        { event: 'proc-callfun-getNew', msg: 'start...' },
        { event: 'proc-callfun-getNew', num: 1, msg: 'done' },
        { event: 'proc-callfun-getCurrent', msg: 'start...' },
        { event: 'proc-callfun-getCurrent', num: 2, msg: 'done' },
        { event: 'compare', msg: 'start...' },
        {
            event: 'compare',
            numRemove: 1,
            numAdd: 0,
            numModify: 0,
            numSame: 1,
            msg: 'done'
        },
        {
            event: 'proc-remove-callfun-remove',
            id: '114116',
            msg: 'start...'
        },
        { event: 'proc-remove-callfun-remove', id: '114116', msg: 'done' },
        { event: 'end', msg: 'done' }
    ]

    it('test once', async () => {
        let r = await test()
        let rr = ms
        assert.strict.deepEqual(r, rr)
    })

})
