"use strict";
/*jshint eqnull:true */
/*jshint globalstrict:true */
/*jshint node:true */
/*eslint-disable no-console */

var obj = {
    prop: {
        'subprop1':1
    },
    prop2: {
        "subprop2":2,
        'subprop3':3
    }

};

function fn() {
    //USE_STRICT_MARK
    return 3+obj.prop.subprop2;
}

var f = fn();

f += 2;

