//////////////////////////////////////////////////////////////////////////
// Copyright (C) 2005 Marc Belmont				        //
// 								        //
// This file is free software; you can redistribute it and/or modify    //
// it under the terms of the GNU General Public License as published by //
// the Free Software Foundation; either version 2, or (at your option)  //
// any later version.						        //
// 								        //
// This file is distributed in the hope that it will be useful,	        //
// but WITHOUT ANY WARRANTY; without even the implied warranty of       //
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the        //
// GNU General Public License for more details.			        //
// 								        //
// Commentary:							        //
// Javascript lisp interpreter by marc belmont http://marcbelmont.com   //
// 								        //
//////////////////////////////////////////////////////////////////////////

var DEBUG = 1;
var TEST = [
  // "(list (setq x (list))(if x 1 2))",
  // "(list (setq x (list 1 2 3)) (cons (car x) (cons (car x) (list))))",
  "((js Math.abs) -23)",
  "(list "+
    "(defun reverse- (x r) "+
    "(if (not (car x)) r (reverse- (cdr x) (cons (car x)))))"+
    "(defun reverse (x) (reverse- x (list)))"+
    "(reverse (list 1 2 3 4))"+
    ")",
  "(list "+
    "(defun add1 (x) (+ 1 x))"+
    "(defun fact (x) (if (<= x 1) 1 (* x (fact (- x 1)))))"+
    "(fact 5))",
  "(list "+
    "(defun mapcar (x f) "+
    "(if (not (car x)) (list) (cons (f (car x)) (mapcar (cdr x) f))))"+
    "(mapcar (list 1 2 3) (lambda (x) (* x x))))",
  "((lambda (x y z) (setq x (+ x 1)) (+ 1 x y z x)) 2 2 2)",
  "(list (defun +en (x y) (+ x x y)) (+en 1 2))",
  "(cdr (list 1 2 3))",
  "(or 0 1 0 0)",
  "((js Math.floor) 23.32)",
  "(car (list 1 2 3))",
  "(and 1 2 3 4 0)",
  "(list (setq test 123) (setq test2 (+ test 20)) (+ 1 test2))",
  "(- 1 2 3)",
  "(if 1 (2 \"(())\" 3",
  '(if 1 "cool" 3)',
  "(if 0 2 (+ 0 2 4) 2 99)",
  "(+ 1 (if 1 (+ 1 20) 3))",
  "(+ 1 (* 2",
  "(+ 1 2 (* 3 4))",
][0]
var _text = null;
var _balanced = 0;
var _env = null;

function init() {
  // trace(read(TEST));
}

function read(text) {
  // if (1) {
  try {
    _balanced = 0;
    _text = $.trim(text);
    var code = parser()[0];
    if (_balanced > 0)
      throw "The expression is not balanced. Add "+_balanced+" parentheses.";
    else if (_balanced < 0)
      throw "The expression is not balanced. Remove "+_balanced+" parentheses.";
    // trace(code);
    if (!_env) _env = {};
    return eval_(code, _env);
  } catch (e) {
    return "Error: "+e;
  }
}

function eval_(expr, env) {
  // atoms
  if (!isNaN(expr)) {
    return Number(expr);
  } else if (expr == "nil") {
    return null;
  } else if (expr[0] == '"') {
    return expr.slice(1);

    // list
  } else if (expr[0] == "list") {
    return $.map(expr.slice(1),
		 function(x) {
		   var v = eval_(x, env);
		   if ($.isArray(v))
		     return Array(v);
		   return v;
		 });

    // variables
  } else if (getenv(expr, env)) {
    return getenv(expr, env);
  } else if (expr[0] == "setq" || expr[0] == "set!") {
    env[expr[1]] = eval_(expr[2], env);
    return env[expr[1]];

    // conditional
  } else if (expr[0] == "if") {
    if (eval_(expr[1], env))
      return eval_(expr[2], env);
    $.each(expr.slice(2, expr[expr.length - 2]),
	   function(i, x) { eval_(x, env); });
    return eval_(expr[expr.length - 1], env);

    // procedures
  } else if (expr in operators) {
    return operators[expr];
  } else if (expr[0] == "lambda") {
    return makeproc(expr[1], expr.slice(2), env);
  } else if (expr[0] == "defun") {
    env[expr[1]] = makeproc(expr[2], expr.slice(3), env);
    return env[expr[1]];
  } else if (expr[0] == "js") { // call a javascript function
    return eval(expr[1]);

    // apply
  } else if ($.isArray(expr)) {
    return apply_(
      eval_(expr[0], env),
      $.map(expr.slice(1), function(x, i) {
	var v = eval_(x, env);
	if ($.isArray(v))
	  return Array(v);
	return v;
      })
    );

    // error
  } else {
    throw expr+" is not defined"
  }
}

function apply_(proc, args) {
  if ($.isFunction(proc)) {
    return proc.apply(this, args);
  }
  throw "Procedure "+proc+" is not defined";
}

function makeproc(args, body, env) {
  return function() {
    // extend the env
    var arguments_ = arguments;
    var newenv = {};
    newenv["__up__"] = env;
    $.each(args, function(i, x) { newenv[x] = arguments_[i]; });
    $.each(body.slice(0, body.length - 1),
	   function(i, x) { eval_(x, newenv); });
    return eval_(body[body.length - 1], newenv);
  };
}

function getenv(expr, env) {
  if (typeof expr != "string") return false;
  if (expr in env) return env[expr];
  if ("__up__" in env) return getenv(expr, env["__up__"]);
  return false;
};

////////////////
// primitives //
////////////////

var operators = {
  // list
  "car":function() {
    var l = arguments[0];
    if (!l.length) return null;
    return l[0];
  },
  "cdr":function() {
    var l = arguments[0];
    if (!l.length) return [];
    return l.slice(1);
  },
  "cons":function() {
    var a = arguments[1];
    a.unshift(arguments[0])
    return a;
  },

  // logical
  "not":function() {
    return !arguments[0];
  },
  "and":function() {
    for (var i = 0; i < arguments.length; i++) {
      if (!arguments[i]) return false;
    }
    return true;
  },
  "or":function() {
    for (var i = 0; i < arguments.length; i++) {
      if (arguments[i]) return true;
    }
    return false;
  },

  // comparison
  "<=":function(x, y) { return x <= y; },
  "<":function(x, y) { return x < y; },
  ">=":function(x, y) { return x >= y; },
  ">":function(x, y) { return x > y; },
  "=":function(x, y) { return x == y; },
  "eq":function(x, y) { return x === y; },

  // arithmetic
  "+":function() {
    var res = 0;
    $.each(arguments, function(i, x) { res += x; });
    return res;
  },
  "-":function() {
    var res = arguments[0] * 2;
    $.each(arguments, function(i, x) { res -= x; });
    return res;
  },
  "*":function() {
    var res = 1;
    $.each(arguments, function(i, x) { res *= x; });
    return res;
  },
  "/":function() {
    var res = arguments[0] * arguments[0];
    $.each(arguments, function(i, x) { res /= x; });
    return res;
  }
};

///////////////////////////
// convert text to lists //
///////////////////////////

function scanner() {
  if (!_text.length) return "";
  var start = 0, index = 1;
  if (_text.charAt(0) == "(" || _text.charAt(0) == ")") {
    index = 1;
    // check the text is balanced
    _balanced += _text.charAt(0) == "(" ? 1 : -1;
  } else if (_text.charAt(0) == '"') {
    index = _text.search(/[^\\]"/) + 1;
  } else
    index = _text.search(/[ \n)]/);
  if (index < 1) index = _text.length;
  var t = _text.substring(start, index);
  _text = $.trim(_text.substring(index));
  return t;
}

function parser() {
  var result = [];
  var token = scanner();
  while (token != ")" && token != "") {
    var expr = null;
    if (token == "(")
      expr = parser();
    else
      expr = token;
    result.push(expr);
    token = scanner();
  }
  return result;
}
