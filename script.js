/**
 * The file is script.js
 * @author wupengju
 * @time 2017.5.10
 * @description 给本学院题库所写的自动刷题的脚本
 */

;(function (window) {
	'use strict';


	/**
	 * 过滤输入的参数并进行验证
	 * @param {[Object]} options 构造Answer实例对象的相关配置参数
	 */
	var Answer = function (options) {

		options = Answer.detectOptions(options);

		if (options !== false) {
			return new Answer.fn.init(options);
		}
	};

	Answer.fn = Answer.prototype = {
		constructor: Answer,
		version: '0.1.1',
		init: function (options) {
			this.timer = null; // 定时器
			this.$mainFrame = this.setMainFrame(options.arrFrames);
			this.mainFrameWindow = this.$mainFrame.window;
			this.validateStr = options.validateStr; // 验证章节结束的字符串
			this.$chapter = this.mainFrameWindow.document.getElementById(options.chapterSelector); // 章的DOM对象
			this.$promptInfo = this.mainFrameWindow.document.getElementById(options.promptInfoSelector); // 显示提示信息的DOM对象
			this.$chapterOptions = this.$chapter.getElementsByTagName('option');
			this.arrChapters = this.setArrChapters(); // 章节项目的信息组成的对象数组
			this.curChapterIndex = this.setCurChapterIndex(); // 正在刷的题目的章节数
			this.arrErrorChapters = options.arrErrorChapters || []; // 有错误章节项目的序列数组

			return this;
		}
	};

	Answer.fn.init.prototype = Answer.fn;

	// 添加默认参数
	Answer.addDefaultOptions = function (options, arrOptionsKeys) {

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
	Answer.detectOptions = function (options) {
		var ret = [],
				checkSign = false,
				arrOptionsKeys = [];

		if (options === undefined) { // 添加默认参数
			return Answer.addDefaultOptions(options);
		} else { // 检测配置参数
			if (!Answer.detectDataTypes(options, 'Object')) {
				console.log('请传入对象参数.');
				return false;
			}

			// 按照默认参数的设置顺序检测参数
			if ('arrFrames' in options) { // 先判断参数的存在性，再判断参数的类型
				ret.push(Answer.detectDataTypes(options.arrFrames, 'Array'));
			}
			
			if ('validateStr' in options ) { // 先判断参数的存在性，再判断参数的类型
				ret.push(Answer.detectDataTypes(options.validateStr, 'String'));
			}

			if ('chapterSelector' in options) { // 先判断参数的存在性，再判断参数的类型
				ret.push(Answer.detectDataTypes(options.chapterSelector, 'String'));
			}
			
			if ('promptInfoSelector' in options ) { // 先判断参数的存在性，再判断参数的类型
				ret.push(Answer.detectDataTypes(options.promptInfoSelector, 'String'));
			}

			if ('arrErrorChapters' in options) { // 先判断参数的存在性，再判断参数的类型
				ret.push(Answer.detectDataTypes(options.arrErrorChapters, 'Array'));
			}

			checkSign = ret.every(function (item) {
				return item === true ? true : false;
			});

			if (checkSign) {
				arrOptionsKeys =  Object.keys(options); // 可能有兼容性问题
				if (arrOptionsKeys.length < 5) { // 优化：只有当传入配置参数的属性不够的时候才会添加默认参数
					options = Answer.addDefaultOptions(options, arrOptionsKeys);
				}
				return options;
			} else {
				console.log('传入的参数不符合规范.');
				return false;
			}
		}
	};

	// 检测数据类型
	Answer.detectDataTypes = function (value, type) {

		return Object.prototype.toString.apply(value) === '[object ' + type + ']' ? true : false;
	};

	// 兼容触发selelct元素的change事件
	Answer.triggerChange = function ($element) {
		if ($element.fireEvent) {
		  $element.fireEvent('onchange');
		} else {
		  $element.onchange();
		}
	};


	/*
	* 设置$mainFrame属性
	 */
	Answer.fn.setMainFrame = function (arrFrames) {
		var curFrames = window;
		for (var i = 0, len = arrFrames.length; i < len; i++) {
			curFrames = curFrames.frames[ arrFrames[ i ] ];
		}
		return curFrames;
	};

	/*
	* 获取当前章节【this.curChapterIndex】的题目总数
	 */
	Answer.fn.getChapterProNum = function (curChapterValue, index) {

		var chapterProNum = 0,
				_self = this;

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
							 		// console.log(_self.arrChapters);
							 })
							 .catch(function (e) {
							   throw e;
							 });
			})
			.catch(function (e) {
				console.log(e);
			});
	}; 

	/*
	* 设置arrChapters属性
	 */
	Answer.fn.setArrChapters = function () {
		var curChapterOption = null,
				arrRets = [],
				curChapterValue = 0;

		for (var i = 0, len = this.$chapterOptions.length; i < len; i++) {
			curChapterOption = this.$chapterOptions[ i ];
			curChapterValue = parseInt(curChapterOption.value, 10);

			arrRets.push({
				chapterName: curChapterOption.innerText,
				chapterValue: curChapterValue,
				chapterProNum: i === 0 ? this.getChapterProNum(curChapterValue, i) : 0, // 默认是从第一章开始，就默认获取第一章的总题数
				finishSign: false
			});
		}

		return arrRets;
	};


	/*
	* 设置curChapterIndex属性
	 */
	Answer.fn.setCurChapterIndex = function () {
		var curChapterValue = parseInt(this.$chapter.value, 10),
				retNum = 0;

		this.arrChapters.forEach(function (item, index) {
			retNum = item.chapterValue === curChapterValue ? index : retNum;
		});

		var _self = this;
		this.$chapter.addEventListener('change', function () {
			_self.rewriteCurChapterIndex();
			_self.dealErrorChapter();
		});

		return retNum;
	};

	/*
	* 更新curChapterIndex属性
	 */
	Answer.fn.rewriteCurChapterIndex = function () {
		this.curChapterIndex = this.setCurChapterIndex();
	};

	/*
	* 遍历查询，得出正确的答案再进行处理
	 */
	Answer.fn.getAnswer = function () {
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
	    		  if (!_self.validateEnd()) {
	    		    ret = arrRets[ i ];
	    		  } else {
	    		    ret = false;
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
    		if (ret) {
    		  _self.$mainFrame.makeChoice(ret);
    		  ret = false;
    		} else {
    		  clearInterval(_self.timer);
    		  _self.toNextChapter();
    		  _self.dealErrorChapter();
    		}
    	})
    	.catch(function (e) {
    		console.log(e);
    	});
	};


	/*
	* 开启自动查询定时器
	 */
	Answer.fn.autoGetAnswer = function (duringTime) {
		var _self = this;

		this.timer = setInterval(function () {
			_self.getAnswer();
		}, duringTime);
	};


	/*
	* 验证一章的自动刷题是否结束
	 */
	Answer.fn.validateEnd = function () {

		return this.$promptInfo.innerText.indexOf(this.validateStr) > -1 ? true : false;
	};


	/*
	* 跳转到下一个章节
	 */
	Answer.fn.toNextChapter = function () {
		this.curChapterIndex++;
		this.$chapter.value = this.arrChapters[ this.curChapterIndex ].chapterValue;
		this.$chapterOptions[ this.curChapterIndex ].selected = true;

		Answer.triggerChange(this.$chapter);

		this.dealErrorChapter();

		if (this.end() === true) {
			clearInterval(this.timer);
		} else {
			this.autoGetAnswer(3000);
		} 
	};

	// 触发章的onchange事件后自动更新了小节，所以这个方法没用了~~~
	Answer.fn.changeSection = function () {};


	/*
	* 处理有错误的章节，不能进入正常自动刷题流程
	 */
	Answer.fn.dealErrorChapter = function () {
		var curChapterIndex = this.curChapterIndex;
		if (this.arrErrorChapters.indexOf(++curChapterIndex) > -1) {
			this.toNextChapter();
		}
	};


	/*
	* 开启自动刷题
	 */
	Answer.fn.start = Answer.fn.reStart = function () {
		this.autoGetAnswer(3000);
	};


	/*
	* 结束自动刷题
	 */
	Answer.fn.end = function () {

		  if (++this.curChapterIndex === this.$chapterOptions.length && _self.validateEnd()) {
				clearInterval(this.timer);
				console.log('自动刷题结束!');
				return true;
		  }
	};

	/*
	* 提供关闭(暂停)脚本执行接口
	 */
	Answer.fn.stop = Answer.fn.pause = function () {

		  clearInterval(this.timer);
	};

	// test
	var options = {
		arrFrames: ['topmain', 'main'], 
		validateStr: '此章节下的程序已读取结束',
		chapterSelector: 'cChapter',
		promptInfoSelector: 'divInfo',
		arrErrorChapters: [3]
	};
  
  // 自主传参
	// var answer = Answer(options);

	// 自主传参
	var answer = Answer({
		arrErrorChapters: [3]
	});

	// 不传参。采用默认参数
	// var answer = Answer(); 

	answer.start(); // 默认自动开启脚本执行

	window.answer = answer;

}(window));