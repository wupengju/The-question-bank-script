/**
 * prototype_script.js
 * @author wupengju
 * @GitHub: https://github.com/wupengju/The-question-bank-script
 * @description 给本学院题库所写的自动刷题的脚本，采用委托设计模式
 */
;(function (window) {
	'use strict';


	/**
	 * 作为自定义原型链的最后委托对象
	 */
	var Utils = {};

	// 添加默认参数
	Utils.addDefaultOptions = function (options, arrOptionsKeys) {

		var defaultOptions = {
			arrFrames: ['topmain', 'main'], 
			validateStr: '此章节下的程序已读取结束',
			chapterSelector: 'cChapter',
			promptInfoSelector: 'divInfo',
			arrErrorChapters: [3]
		};

		if (arguments.length === 1) {
			return defaultOptions;
		} else {
			for (var i = 0, len = arrOptionsKeys.length; i < len; i++) {
				defaultOptions[ arrOptionsKeys[ i ] ] = options[ arrOptionsKeys[ i ] ]; // 直接覆盖
			}
			return defaultOptions;
		}
	};

	// 检测构造函数的配置参数
	Utils.detectOptions = function (options) {
		var ret = [],
				checkSign = false,
				arrOptionsKeys = [];

		if (options === undefined) { // 添加默认参数
			return this.addDefaultOptions(options);
		} else { // 检测配置参数
			if (!this.detectDataTypes(options, 'Object')) {
				console.log('请传入对象参数.');
				return false;
			}

			// 按照默认参数的设置顺序检测参数
			if ('arrFrames' in options) { // 先判断参数的存在性，再判断参数的类型
				ret.push(this.detectDataTypes(options.arrFrames, 'Array'));
			}
			
			if ('validateStr' in options ) { // 先判断参数的存在性，再判断参数的类型
				ret.push(this.detectDataTypes(options.validateStr, 'String'));
			}

			if ('chapterSelector' in options) { // 先判断参数的存在性，再判断参数的类型
				ret.push(this.detectDataTypes(options.chapterSelector, 'String'));
			}
			
			if ('promptInfoSelector' in options ) { // 先判断参数的存在性，再判断参数的类型
				ret.push(this.detectDataTypes(options.promptInfoSelector, 'String'));
			}

			if ('arrErrorChapters' in options) { // 先判断参数的存在性，再判断参数的类型
				ret.push(this.detectDataTypes(options.arrErrorChapters, 'Array'));
			}

			checkSign = ret.every(function (item) {
				return item === true ? true : false;
			});

			if (checkSign) {
				arrOptionsKeys =  Object.keys(options); // 可能有兼容性问题
				if (arrOptionsKeys.length < 5) { // 优化：只有当传入配置参数的属性不够的时候才会添加默认参数
					options = this.addDefaultOptions(options, arrOptionsKeys);
				}
				return options;
			} else {
				console.log('传入的参数不符合规范.');
				return false;
			}
		}
	};

	// 检测数据类型
	Utils.detectDataTypes = function (value, type) {

		return Object.prototype.toString.apply(value) === '[object ' + type + ']' ? true : false;
	};

	// 兼容触发selelct元素的change事件——章节选择是select
	Utils.trigger = function ($element, eventType) {
		if ($element.fireEvent) {
		  $element.fireEvent(eventType);
		} else {
		  $element[ eventType ]();
		}
	};


	/**
	 * 定义刷题委托的对象
	 * 将 Answer 委托到 Utils
	 */
	var Answer = Object.create(Utils);

	// 初始化
	Answer.init = function (options) {
		this.timer = null; // 定时器
		this.$mainFrame = this.setMainFrame(options.arrFrames);
		this.mainFrameWindow = this.$mainFrame.window;
		this.validateStr = options.validateStr; // 检测章节结束的字符串
		this.$chapter = this.mainFrameWindow.document.getElementById(options.chapterSelector); // 章的DOM对象
		this.$promptInfo = this.mainFrameWindow.document.getElementById(options.promptInfoSelector); // 显示提示信息的DOM对象
		this.$chapterOptions = this.$chapter.getElementsByTagName('option');
		this.arrChapters = this.setArrChapters(); // 章节项目的信息组成的对象数组
		this.curChapterIndex = this.setCurChapterIndex(); // 正在刷的题目的章节数
		this.arrErrorChapters = options.arrErrorChapters || []; // 有错误章节项目的序列数组
	};

	// 设置$mainFrame属性
	Answer.setMainFrame = function (arrFrames) {
		var curFrames = window;
		for (var i = 0, len = arrFrames.length; i < len; i++) {
			curFrames = curFrames.frames[ arrFrames[ i ] ];
		}
		return curFrames;
	};

	// 设置arrChapters属性
	Answer.setArrChapters = function () {
		var curChapterOption = null,
				arrRets = [],
				curChapterValue = 0;

		for (var i = 0, len = this.$chapterOptions.length; i < len; i++) {
			curChapterOption = this.$chapterOptions[ i ];
			curChapterValue = parseInt(curChapterOption.value, 10);

			arrRets.push({
				chapterName: curChapterOption.innerText,
				chapterValue: curChapterValue,
				chapterProNum: 0,
				chapterAllErrors: 0,
				finishSign: false
			});
		}

		return arrRets;
	};

	// 设置curChapterIndex属性
	Answer.setCurChapterIndex = function () {
		var curChapterValue = parseInt(this.$chapter.value, 10),
				retNum = 0;

		this.arrChapters.forEach(function (item, index) {
			retNum = item.chapterValue === curChapterValue ? index : retNum;
		});
		
		return retNum;
	};

	// 更新curChapterIndex属性
	Answer.rewriteCurChapterIndex = function (curChapterIndex) {

		this.curChapterIndex = curChapterIndex ? curChapterIndex : this.setCurChapterIndex();
	};

	// 获取当前章节【this.curChapterIndex】的题目总数
	Answer.getChapterProNum = function (curChapterValue, index) {
		var chapterProNum = 0,
				_self = this;


		/**
		 * 获取一章的每个小节的Promise对象
		 * @param  {[String]} CProgramID 该小节对应的ID
		 * @return {[Object]} Promise    通过CProgramID发送异步请求构造的Promise对象
		 */
		function getCProgramIDPromise(CProgramID) {

			return new Promise(function (resolve, reject) {
				var strTestParam = '',
						resObj = null;

				try {
		  		strTestParam = '<cTest><cProgram>' + CProgramID + '</cProgram><cQuestionIndex>0</cQuestionIndex></cTest>';
		  		resObj = _self.$mainFrame.CExam.CPractice.GetJSONTest(strTestParam);
		  		resObj = JSON.parse(resObj.value);
		  		resolve(parseInt(resObj.CQuestion.CQuestionCount, 10));
				} catch(e) {
					reject(e);
				}
			});
		}

		var p = new Promise(function (resolve, reject) {
			try {

		  		var cChapterID = curChapterValue + '';
		  		var resObj = _self.$mainFrame.CExam.CPractice.GetJSONProgramList(cChapterID);

		  		resolve(JSON.parse(resObj.value));

			} catch(e) {
				reject(e);
			}
		});

		p.then(function (cChapterIDObj) {
				return cChapterIDObj;
			})
			.then(function (cChapterIDObj) {

				var arrCProgramIDPromise = [];

				for (var i = 0, len = cChapterIDObj.length; i < len; i++) {
		  		arrCProgramIDPromise.push(getCProgramIDPromise(cChapterIDObj[ i ].CProgramID));
	  		}

				Promise.all(arrCProgramIDPromise)
							 .then(function () {
							 		var arrArgs = [].slice.apply(arguments);
							 		arrArgs = arrArgs.reduce(function (total, curItem) {
							 			return total + curItem;
							 		});
							 		
							 		chapterProNum = arrArgs.reduce(function (total, curItem) {
							 			return total + curItem;
							 		});

							 		_self.arrChapters[ index ].chapterProNum = chapterProNum;
							 		_self.curChapterAllErrors = _self.arrChapters[ index ].chapterAllErrors = Math.floor(_self.arrChapters[ index ].chapterProNum * (1 - _self.correctRate));
							 })
							 .catch(function (e) {
							   throw e;
							 });
			})
			.catch(function (e) {
				console.log(e);
			});
	};

	// 检测一章的自动刷题是否结束
	Answer.validateEnd = function () {

		return this.$promptInfo.innerText.indexOf(this.validateStr) > -1 ? true : false;
	};

	// 跳转到指定章节
	Answer.toSetChapter = function (curChapterIndex) {
		console.log(curChapterIndex);
		this.$chapter.value = this.arrChapters[ curChapterIndex ].chapterValue;
		this.getChapterProNum(this.$chapter.value, curChapterIndex);

		this.trigger(this.$chapter, 'onchange');

		this.dealErrorChapter(); // 处理有错误的章节

		if (this.isEnd() === true) { // 检测题目是否已经刷到最后一张的最后一节
			clearInterval(this.timer);
		} else {
			this.autoGetAnswer(3000);
		} 
	};

	// 跳转到下一个章节
	Answer.toNextChapter = function () {
		this.curErrorTotalQuestions = 0;
		this.curChapterAllErrors = 0;
		this.arrChapters[ this.curChapterIndex ].finishSign = true; // 将本章的刷题完成标志设置为true
		this.curChapterIndex++;
		this.toSetChapter(this.curChapterIndex);
	};

	// 触发章的onchange事件后自动更新了小节，所以不再需要自定义更新小节
	Answer.changeSection = function () {};

	// 处理有错误的章节，不能进入正常自动刷题流程
	Answer.dealErrorChapter = function () {
		var curChapterIndex = this.curChapterIndex;
		if (this.arrErrorChapters.indexOf(++curChapterIndex) > -1) {
			this.toNextChapter();
		}
	};

	// 遍历查询，得出符合的答案再进行处理
	Answer.getAnswer = function () {
		var arrRets = ['A', 'B', 'C', 'D'],
				_self = this;

    var p = new Promise(function (resolve, reject) {
    	var strTestParam = '',
    			resObj = null,
    			ret = null;

  		try {
    	  for (var i = 0; i <= 3; i++) {
	    		strTestParam = '<cTestParam><cQuestion>' + _self.$mainFrame.cQuestionID.value + '</cQuestion><cUserAnswer>' + arrRets[ i ] + '</cUserAnswer></cTestParam>';
	    		resObj = _self.$mainFrame.CExam.CPractice.IsOrNotTrue(strTestParam);
	    		ret = null;

	    		if(resObj.value) {
	    		  if (_self.validateEnd()) { // 检测该章的题目是否已经刷完
	    		    ret = false;
	    		  } else {
	    		  	if (_self.chapterCount !== 0 && _self.chapterCount % 5 === 0 && _self.curErrorTotalQuestions < _self.curChapterAllErrors) {
	    		  		ret = arrRets[ ++i ] !== undefined ? arrRets[ i ] : arrRets[ --i ]; // 避免数组越界
	    		  		_self.curErrorTotalQuestions++;
	    		  	} else {
	    		  		ret = arrRets[ i ];
	    		  	}
	    		  }
	    		  resolve(ret);
	    		  break;
	    		}
    	  }
  		} catch(e) {
  			reject(e);
  		}
    });
    
    p.then(function (ret) {
    		if (ret) { // 符合的答案才进行答案的最终确认——录入数据库
    		  _self.$mainFrame.makeChoice(ret);
    		  _self.chapterCount++;
    		  if (_self.chapterCount % 6 === 0 && _self.curErrorTotalQuestions <= _self.curChapterAllErrors) {
    		  	_self.curErrorTotalQuestions = _self.curErrorTotalQuestions === _self.curChapterAllErrors ? ++_self.curErrorTotalQuestions : _self.curErrorTotalQuestions;
    		  	this.trigger(_self.mainFrameWindow.document.getElementsByClassName('normalButton')[ 1 ], 'onclick'); // 触发下一题按钮
    		  }
    		} else {
    		  clearInterval(_self.timer);
    		  _self.toNextChapter();
    		}
    	})
    	.catch(function (e) {
    		console.log(e);
    	});
	};

	// 创建自动查询定时器
	Answer.autoGetAnswer = function (duringTime) {
		var _self = this;

		clearInterval(this.timer);
		this.timer = setInterval(function () {
			_self.getAnswer();
		}, duringTime);
	};

	// 打印自动刷题脚本的使用说明
	Answer.printScriptUsage = function () {

		console.log("\n/*\n*\t \t\t  #####  #####    # #\n*\t \t\t   #      #      #   #\n*\t  #\t  #  #   #      # #\n*\t   # #    # # \u2014\u2014\u2014\u2014 #\n*\n* GitHub: https://github.com/wupengju/The-question-bank-script\n* \u6D4F\u89C8\u5668\u652F\u6301\uFF1Ahttp://caniuse.com/#search=Promise\n* \n* \u81EA\u52A8\u5237\u9898\u811A\u672C\u7684\u4F7F\u7528\u8BF4\u660E\n* \u542F\u52A8\u6267\u884C\u811A\u672C\uFF1A\n* \t1. answer.start() \uFF1A\u5747\u4F7F\u7528\u9ED8\u8BA4\u53C2\u6570\u5237\u9898\u7AE0\u8282\u6570\u4ECE\u5F53\u524D\u7AE0\u8282\u76F4\u5230\u5237\u5B8C\u4E3A\u6B62 \u548C \u6B63\u786E\u7387\u4E3A 95%\n* \t2. answer.start(1, 2) \uFF1A\u81EA\u5B9A\u4E49\u5237\u9898\u7AE0\u8282\u6570 1-2\n* \t3. answer.start(90) \uFF1A\u81EA\u5B9A\u4E49\u6B63\u786E\u7387\u4F4D 90%\n* \t4. answer.start(1, 2, 90) \uFF1A\u81EA\u5B9A\u4E49\u5237\u9898\u7AE0\u8282\u6570 1-2 \u548C \u6B63\u786E\u7387\u4F4D 90%\n* \t5. answer.start(90, 1, 2) \uFF1A\u81EA\u5B9A\u4E49\u6B63\u786E\u7387\u4F4D 90% \u548C \u5237\u9898\u7AE0\u8282\u6570 1-2\n* \u91CD\u65B0\u6267\u884C\u811A\u672C\uFF1A\n* \tanswer.reStart();\n* \u6682\u505C\u6267\u884C\u811A\u672C\uFF1A\n* \tanswer.pause();\n* \u505C\u6B62\u6267\u884C\u811A\u672C\uFF1A\n* \tanswer.stop();\n*/");
	};

	// 打印最后的刷题情况
	Answer.lastResult = function () {

	  var finishChapter = '已完成：',
	  		noFinishChapter = '未完成：',
	  		curChapter = null;

	  for (var i = 0, len = this.arrChapters.length; i < len; i++) {
	  	curChapter = this.arrChapters[ i ];
	  	if (curChapter.finishSign) {
	  		finishChapter += curChapter.chapterName + '、';
	  	} else {
	  		noFinishChapter += curChapter.chapterName + '、';
	  	}
	  }

	  console.log('刷题情况统计：');
	  console.log(finishChapter);
	  console.log(noFinishChapter);
	};


	/**
	 * 定义刷题对象
	 * 将 answer 委托到 Answer
	 */
  var answer = Object.create(Answer);

  // 设置自动刷题的启动参数
  answer.setup = function (options) {

  	options = this.detectOptions(options);

  	if (options !== false) {
  		this.init(options);
  		this.startChapterIndex = 0; // 自定义刷题开始章数
  		this.endChapterIndex = null; // 自定义刷题结束章数
  		this.correctRate = 0.95; // 自定义刷题符合率

  		this.curChapterAllErrors = 0; // 本章满足正确率错误的题目总数
  		this.curErrorTotalQuestions = 0; // 本章已经错误的总数
  		this.chapterCount = 0; // 章刷题计数器

  		this.endSign = false; // 结束标志
  	}
  };

  // 打印自动刷题脚本的使用说明
  answer.printUsage = function () {

  	this.printScriptUsage();
  };

  // 开启自动刷题
  answer.start = function () {

  	var defaultEndChapter = this.$chapterOptions.length,
  		  _self = this;

  	/**
  	 * 检测参数是否符合要求
  	 * @param  {[Array]} 		arg 	参数类数组对象
  	 * @return {[Boolean]}  true  参数满足条件
  	 * @return {[Boolean]}  false 参数不满足条件
  	 */
  	function detectArguments(arg) {

  		for (var i = 0, len = arg.length; i < len; i++) {
  			if (!this.detectDataTypes(arg[ i ], 'Number')) {
  				return false;
  			}
  		}

  		return true;
  	}


  	/**
  	 * 检测章数目的start和end是否符合
  	 * @param  {[Number]}  startChapterIndex 开始章数的index
  	 * @param  {[Number]}  endChapterIndex   结束章数的index
  	 * @return {[Boolean]} true         开始和结束章数的index都符合
  	 * @return {[Boolean]} false        开始或结束章数的index都不符合
  	 */
  	function detectChapterIndex(startChapterIndex, endChapterIndex) {
  		return (startChapterIndex >= 0 && startChapterIndex <= defaultEndChapter) && (endChapterIndex >= 0 && endChapterIndex <= defaultEndChapter) && startChapterIndex <= endChapterIndex? true : false;
  	}


  	/**
  	 * 检测自定义正确率是否符合
  	 * @param  {[Number]}  rate  自定义正确率
  	 * @return {[Boolean]} true  自定义正确率符合
  	 * @return {[Boolean]} false 自定义正确率不符合
  	 */
  	function detectCorrectRate(rate) {
  		return rate >= 90 && rate <= 99 ? true : false;
  	}


  	/**
  	 * 检测三个参数都同时传入时是否符合
  	 * @param  {[Number]} rate         自定义正确率
  	 * @param  {[Number]} startChapterIndex 开始章数的index
  	 * @param  {[Number]} endChapterIndex   结束章数的index
  	 * @return {[Boolean]} true  			 三个参数都符合
  	 * @return {[Boolean]} false 			 三个参数其中或全部不符合
  	 */
  	function detectThreeArgs(rate, startChapterIndex, endChapterIndex) {
  		return arguments.length === 3 && detectArguments(arguments) && detectCorrectRate(rate) && detectChapterIndex(startChapterIndex, endChapterIndex) ? true : false;
  	}


  	/**
  	 * 抽离三个参数的赋值语句
  	 * @param {[Number]} startChapterIndex 开始章数的index
  	 * @param {[Number]} endChapterIndex   结束章数的index
  	 * @param {[Number]} correctRate  自定义正确率
  	 */
  	function setValues(startChapterIndex, endChapterIndex, correctRate) {
  		_self.startChapterIndex = startChapterIndex - 1; // 自定义刷题开始章数
  		_self.endChapterIndex = endChapterIndex - 1; // 自定义刷题结束章数
  		_self.correctRate = correctRate; // 自定义刷题符合率
  	}


  	/**
  	 * 将重复执行代码片段抽离为单独的函数
  	 * @param  {[Number]} startChapterIndex 开始章数的index
  	 */
  	function excuteMoreArgs(startChapterIndex) {
  		_self.rewriteCurChapterIndex(startChapterIndex);
  		_self.toSetChapter(startChapterIndex);
  	}


  	// 给$chapter绑定change的自定义事件处理程序
  	this.$chapter.addEventListener('change', function () {
  		_self.rewriteCurChapterIndex();
  		_self.dealErrorChapter();
  	});

  	if (arguments.length === 0) { // 均采用默认参数
  		setValues(1, defaultEndChapter - 1, 0.95);
  		excuteMoreArgs(this.startChapterIndex);
  		return;
  	}
  	if (arguments.length === 1 && detectArguments(arguments) && detectCorrectRate(arguments[ 0 ])) { // answer.start(90)
  		setValues(1, defaultEndChapter - 1, (arguments[ 0 ] * 0.01).toFixed(2));
  		excuteMoreArgs(this.startChapterIndex);
  		return;
  	}
  	if (arguments.length === 2 && detectArguments(arguments) && detectChapterIndex(arguments[ 0 ], arguments[ 1 ])) { // answer.start(1, 2)
  		setValues(Math.ceil(arguments[ 0 ]), Math.floor(arguments[ 1 ]), 0.95);
  		excuteMoreArgs(this.startChapterIndex);
  		return;
  	}
  	if (detectThreeArgs(arguments[ 0 ], arguments[ 1 ], arguments[ 2 ])) { // answer.start(90, 1 ,2)
  		setValues(Math.ceil(arguments[ 1 ]), Math.floor(arguments[ 2 ]), (arguments[ 0 ] * 0.01).toFixed(2));
  		excuteMoreArgs(this.startChapterIndex);
  		return;
  	}
  	if (detectThreeArgs(arguments[ 2 ], arguments[ 0 ], arguments[ 1 ])) { // answer.start(1, 2, 90)
  		setValues(Math.ceil(arguments[ 0 ]), Math.floor(arguments[ 1 ]), (arguments[ 2 ] * 0.01).toFixed(2));
  		excuteMoreArgs(this.startChapterIndex);
  		return;
  	} else {
  		console.log('请输入符合规范的开始调用参数.');
  		return false;
  	}
  };

  // 重新开启自动刷题
  answer.reStart = function () {

  	this.autoGetAnswer(3000);
  };

  // 结束自动刷题
  answer.isEnd = function () {

    if (this.curChapterIndex > this.endChapterIndex || (this.curChapterIndex === this.endChapterIndex && this.validateEnd())) {
  		clearInterval(this.timer);

  		if (!this.endSign) {
  			this.lastResult();
  			console.log('本次自动刷题完成!');
  			this.endSign = true;
  		}
  		return true;
    }
  };

  // 提供关闭(暂停)脚本执行接口
  answer.stop = answer.pause = function () {

  	clearInterval(this.timer);
  };

	window.answer = answer;

}(window));


/**
 * 执行代码
 */
;(function (window) {
	'use strict';

	// 完整传参示例
	var options = {
		arrFrames: ['topmain', 'main'], 
		validateStr: '此章节下的程序已读取结束',
		chapterSelector: 'cChapter',
		promptInfoSelector: 'divInfo',
		arrErrorChapters: [3]
	};

	// 调用传参：参数都是可选参数
	var answer = window.answer;

	// answer.setup(options); // 设置全部参数
	// answer.setup(); // 全部采用默认参数
	answer.setup({ // 设置部分参数
		arrErrorChapters: [3]
	});
	 
	answer.printUsage(); // 打印自动刷题脚本的使用说明

}(window));