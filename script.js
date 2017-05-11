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

		var ret = [],
				checkSign = false;

		if (!Answer.detectDataTypes(options, 'Object')) {
			console.log('请传入对象参数.');
			return false;
		}

		ret.push(Answer.detectDataTypes('arrFrames' in options && options.arrFrames, 'Array'));
		ret.push(Answer.detectDataTypes('validateStr' in options && options.validateStr, 'String'));

		checkSign = ret.every(function (item) {
			return item === true ? true : false;
		});

		function setMainFrame(arrFrames) {
			var curFrames = window;
			for (var i = 0, len = arrFrames.length; i < len; i++) {
				curFrames = curFrames.frames[ arrFrames[ i ] ];
			}
			return curFrames;
		}

		if (checkSign) {
			options.$mainFrame = setMainFrame(options.arrFrames);
			return new Answer.fn.init(options);
		} else {
			console.log('传入的参数不符合规范.');
			return false;
		}
	};

	Answer.fn = Answer.prototype = {
		constructor: Answer,
		version: '0.1.1',
		init: function (options) {
			this.timer = null; // 定时器
			this.$mainFrame = options.$mainFrame;
			this.mainFrameWindow = this.$mainFrame.window;
			this.validateStr = options.validateStr; // 验证章节结束的字符串
			this.$chapter = this.mainFrameWindow.document.getElementById(options.chapterSelector); // 章的DOM对象
			this.$promptInfo = this.mainFrameWindow.document.getElementById(options.promptInfoSelector); // 显示提示信息的DOM对象
			this.$chapterOptions = this.$chapter.getElementsByTagName('option');
			this.arrChapters = this.setArrChapters(); // 章节项目的信息组成的对象数组
			this.curChapterIndex = this.setCurChapterIndex(); // 正在刷的题目的章节数
			this.arrErrorChapters = options.arrErrorChapters; // 有错误章节项目的序列数组

			return this;
		}
	};

	Answer.fn.init.prototype = Answer.fn;

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
	* 设置arrChapters属性
	 */
	Answer.fn.setArrChapters = function () {
		var curChapterOption = null,
				arrRets = [];

		for (var i = 0, len = this.$chapterOptions.length; i < len; i++) {
			curChapterOption = this.$chapterOptions[ i ];
			arrRets.push({
				chapterText: curChapterOption.innerText,
				numValue: parseInt(curChapterOption.value, 10),
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
			retNum = item.numValue === curChapterValue ? index : retNum;
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

  		try {
    	  for (var i = 0; i <= 3; i++) {
	    		var strTestParam = '<cTestParam><cQuestion>' + _self.$mainFrame.cQuestionID.value + '</cQuestion><cUserAnswer>' + arrRets[ i ] + '</cUserAnswer></cTestParam>';
	    		var resObj = _self.$mainFrame.CExam.CPractice.IsOrNotTrue(strTestParam);
	    		var ret = null;

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
		this.$chapter.value = this.arrChapters[ this.curChapterIndex ].numValue;
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
	Answer.fn.start = Answer.fn.reStart = function (duringTime) {
		
		if (Answer.detectDataTypes(duringTime, 'Number')) {
			duringTime = duringTime > 3000 ? 3000 : duringTime;
			duringTime = duringTime < 2000 ? 2000 : duringTime;
		}

		this.autoGetAnswer(duringTime);
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

	var answer = Answer(options);
	answer.start(3000); // 默认自动开启脚本执行

	window.answer = answer;

}(window));