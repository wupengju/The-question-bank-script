/**
 * The file is script.js
 * @author wupengju
 * @time 2017.5.10
 * @description 给本学院题库所写的自动刷题的脚本
 */

function auto() {
  
  var timer = null; // 定时器
  var $mainFrame = window.frames["topmain"].frames["main"]; 
  var mainFrameWindow = $mainFrame.window;
  var validateStr = ''; // 验证章节结束的字符串
  var curNum = 0; // 目前已刷完题目的章节数
  
  // 跳转到下一个章节
  function toNextNum(turnLast, turnNew, stopNum) { //turnLast=232 turnNew = 241 stopNum=250
		
		var $cChapter = mainFrameWindow.document.getElementById('cChapter');
    var curChapter = parseInt($cChapter.value, 10); // 当前章节数
    var $chapterOptions = $cChapter.getElementsByTagName('option');
	
		function stopAutoAnswer() {
		  if ((curNum + 1) === $chapterOptions.length && validateChangeNum('此章节下的程序已读取结束')) {
			console.log(curNum + 1);
			clearInterval(timer);
			alert('自动刷题已结束！');
			return true;
		  }
		}
		
	  curChapter++;
		curNum++;
		curChapter = curChapter === (turnLast++) ? turnNew : curChapter;

		triggerChange($cChapter);
		$cChapter.value = curChapter;
		$chapterOptions[ curNum ].selected = true;
		
		newProgram();
		timer = stopAutoAnswer() === true ? null : autoAnswer(3000);
 	}
  
  // 兼容触发selelct的change事件
  function triggerChange($element) {
		if ($element.fireEvent) {
		  $element.fireEvent('onchange');
		} else {
		  $element.onchange();
		}
 	}

  // 跳转到新章节后，更新章节的小节
  function newProgram() {
		var $cProgram = mainFrameWindow.document.getElementById('cProgram');
		triggerChange($cProgram);
		$cProgram.value = $cProgram.getElementsByTagName('option')[ 0 ].value;
		$cProgram.getElementsByTagName('option')[ 0 ].selected = true;
  }
 
  function validateChangeNum(str) {
    var $mainFrameInfo = mainFrameWindow.document.getElementById('divInfo');
    return $mainFrameInfo.innerText.indexOf(str) > -1 ? true : false;
  } 

  // 自动刷每一小节的题目
  function autoPro() {

    function numToChoice(num) {
      switch (num) {
        case 0: return 'A';
        case 1: return 'B';
        case 2: return 'C';
        case 3: return 'D';
	  	}
    }

    var p = new Promise(function (resolve, reject) {

  		try {
    	  for (var i = 0; i <= 3; i++) {
	    		var vTestParam = '<cTestParam><cQuestion>' + $mainFrame.cQuestionID.value + '</cQuestion><cUserAnswer>' + numToChoice(i) + '</cUserAnswer></cTestParam>';
	    		var isTrue = $mainFrame.CExam.CPractice.IsOrNotTrue(vTestParam);
	    		var ret = null;

	    		if(isTrue.value) {
	    		  if (!validateChangeNum('此章节下的程序已读取结束')) {
	    		    ret = numToChoice(i);
	    		  } else {
	    		    ret = false;
	    		  }
	    		  resolve(ret);
	    		}
    	  }
  		} catch(e) {
  			reject(e);
  		}
    });
    
    p.then(function (ret) {
    		if (ret) {
    		  $mainFrame.makeChoice(ret);
    		  ret = false;
    		} else {
    		  clearInterval(timer);
    		  toNextNum();
    		}
    	})
    	.catch(function (e) {
    		console.log(e);
    	});
	
		// function getAnswer() {
		//   for (var i = 0; i <= 3; i++) {
		//     var vTestParam = '<cTestParam><cQuestion>' + $mainFrame.cQuestionID.value + '</cQuestion><cUserAnswer>' + numToChoice(i) + '</cUserAnswer></cTestParam>';
		//     var isTrue = $mainFrame.CExam.CPractice.IsOrNotTrue(vTestParam);
			
		// 		if(isTrue.value) {
		// 		  if (!validateChangeNum('此章节下的程序已读取结束')) {
		// 		    return numToChoice(i);
		// 		  } else {
		// 		    return false;
		// 		  }
		// 		}
		//   }
		// }

		// var answer = getAnswer();
		// if (answer) {
		//   $mainFrame.makeChoice(answer);
		//   answer = false;
		// } else {
		//   clearInterval(timer);
		//   toNextNum();
		// }
  }
  
  function autoAnswer(time) {
    return setInterval(autoPro, time);
  }

  timer = autoAnswer(3000);
  
  return timer;
}

var timer = auto();

window.onunload = function () {
  clearInterval(timer);
};