# w-data-scheduler
A scheduler for data.

![language](https://img.shields.io/badge/language-JavaScript-orange.svg) 
[![npm version](http://img.shields.io/npm/v/w-data-scheduler.svg?style=flat)](https://npmjs.org/package/w-data-scheduler) 
[![license](https://img.shields.io/npm/l/w-data-scheduler.svg?style=flat)](https://npmjs.org/package/w-data-scheduler) 
[![npm download](https://img.shields.io/npm/dt/w-data-scheduler.svg)](https://npmjs.org/package/w-data-scheduler) 
[![npm download](https://img.shields.io/npm/dm/w-data-scheduler.svg)](https://npmjs.org/package/w-data-scheduler) 
[![jsdelivr download](https://img.shields.io/jsdelivr/npm/hm/w-data-scheduler.svg)](https://www.jsdelivr.com/package/npm/w-data-scheduler)

## Documentation
To view documentation or get support, visit [docs](https://yuda-lyu.github.io/w-data-scheduler/global.html).

## Installation

### Using npm(ES6 module):
```alias
npm i w-data-scheduler
```

#### Example:
> **Link:** [[dev source code](https://github.com/yuda-lyu/w-data-scheduler/blob/master/g.mjs)]
```alias
import w from 'wsemi'
import WDataScheduler from './src/WDataScheduler.mjs'

//fdTagRemove
let fdTagRemove = './_tagRemove'
w.fsCleanFolder(fdTagRemove)

//fdTaskCpActualSrc
let fdTaskCpActualSrc = './_taskCpActualSrc'
w.fsCleanFolder(fdTaskCpActualSrc)

//fdTaskCpSrc
let fdTaskCpSrc = './_taskCpSrc'
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
    console.log('change', msg)
})
// change { event: 'start', msg: 'running...' }
// change { event: 'proc-callfun-getNew', msg: 'start...' }
// change { event: 'proc-callfun-getNew', num: 2, msg: 'done' }
// change { event: 'proc-callfun-getCurrent', msg: 'start...' }
// change { event: 'proc-callfun-getCurrent', num: 1, msg: 'done' }
// change { event: 'proc-compare', msg: 'start...' }
// change {
//   event: 'proc-compare',
//   numRemove: 0,
//   numAdd: 1,
//   numModify: 0,
//   numSame: 1,
//   msg: 'done'
// }
// change { event: 'proc-add-callfun-add', id: '114116', msg: 'start...' }
// change { event: 'proc-add-callfun-add', id: '114116', msg: 'done' }
// change { event: 'end', msg: 'done' }
```

## Breaking changes

### A failed item no longer cancels the round
Applies to the release after 1.0.76.

`funRemove`, `funAdd` and `funModify` are called item by item.

- **Before**: when one item failed (the function threw or its promise was rejected, or updating the task state failed), the remaining items of the round were skipped, and `cancel-stage-main` and `cancel-stage-beforeEnd` were recorded with `error at <event name>`. An item that always failed (for example a broken source file) kept blocking all items after it in every round.
- **Now**: the other items are still processed. The failed item records its `error` event as before (with the original error message) and is listed in `failed`. When at least one item failed, one `warn` event `fail-items-stage-main` (`{ numFail, items, msg: 'some items failed' }`) is recorded after the items (`srLog.warn`, which was not used before, is now called). Item failures no longer record `cancel-stage-main` or `cancel-stage-beforeEnd`, and with `useShowLog` they no longer print `error occurred, task canceled`. A failed item is not recorded in the task state, so it is retried in the next round as long as `funGetCurrent` does not report it as done.
- **Unchanged**: an error of `funAfterStart`, `funGetNew`, `funGetCurrent` or of the comparison still cancels the round before any item is processed.
- **New**: `funBeforeEnd` receives the result of the round, and the `end` listeners receive their own copy of the same content:

```alias
{
    success: { add: [], modify: [], remove: [] }, //ids (values of keyId) processed successfully
    failed: [ //failed items
        { id: '114116', mode: 'add', event: 'proc-add-callfun-add', msg: 'funAdd failed' },
    ],
    msgCancel: '', //why no item was processed in this round (e.g. 'no data', 'no difference'), otherwise ''
}
```

`msg` is one of `funAdd failed`, `funModify failed`, `funRemove failed` or `failed to update task state` (the original error message is not included).

- **Migration**: treat an item as done only when it is in `success` (for example, in `funBeforeEnd` keep or move only the data of successful ids; an item that is not listed is not done). `funAdd`, `funModify` and `funRemove` must be safe to call again, because a failed item is retried. A function passed as `funBeforeEnd` now receives an argument. If something relied on the later items not being processed after a failure, check `failed` in your own functions.

### `funGetNew` and `funGetCurrent` must return an array
Applies to the release after 1.0.51.

The value returned by `funGetNew` and `funGetCurrent` (after `await`) must be an array.

- **Before**: a non-array value (`undefined`, `null`, a string, a number, an object) was not rejected. It was either treated like an empty array, or (for `funGetNew`) canceled as `no data`, as if the data had been emptied unexpectedly. With the `ltdtDiffByKey` of the next `wsemi` release, which returns an empty result for non-array input, a non-array `funGetCurrent` would even make a round silently synchronize nothing.
- **Now**: the round is canceled. An error event is recorded at the stage of the offending function (event `proc-callfun-getNew` or `proc-callfun-getCurrent` by default) with the message `funGetNew must return an array` or `funGetCurrent must return an array` (the returned value is not included in the message). The comparison does not run and `funAdd`, `funModify` and `funRemove` are not called.
- **Migration**: when there is no existing data (the first run), `funGetCurrent` must return `[]` instead of `undefined` or `null`; `[]` is still valid and all data of `funGetNew` are added as before. An empty array returned by `funGetNew` keeps its previous behavior (the round is canceled as "no data").
