"use strict";
/*jshint eqnull:true */
/*jshint globalstrict:true */
/*jshint node:true */
/*eslint-disable no-console */

var obj = {
    prop: {
        "subprop1":1,
        'subprop2':2
    }

};

function fn() {
    return 3+obj.prop.subprop2;
}

var f = fn();

f += 2;

