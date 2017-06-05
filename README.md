# The-question-bank-script

---

给本学院[C++题库](http://172.22.118.25/ctas)所写的自动刷题的脚本



## 脚本介绍

---

- 规范化编码
- 代码的模块化封装(自执行函数)
- 采用OOP
- 整体采用jQuery的对象实现方式
- 使用Promise对异步请求进行操作
- 定时器和高阶函数的灵活运用
- 原生JS
- 尽可能考虑到脚本代码的性能、可扩展性和可维护性





## 功能

---

- 用户自定义刷题正确率
- 用户自定义刷题的章节【从n到m】
- 自动刷题结束的时候会检测其他的章节是否还有题目没有刷，并给予用户提示信息
- ...





## 使用方法

---

- 点个sta（笑脸）
- 复制script.min.js里面的所有脚本代码
- 登录题库，点击日常练习
- F12打开控制台
- 粘贴拷贝的脚本代码，回车
- 参考使用方法说明开启或暂停脚本





## 开发过程

---

- 2017.5.11补充
  - 给用户提供暂停脚本执行和重新执行脚本服务
  - 预加载-添加兼容性绑定事件addEvent
  - 抽离并完善构造函数的配置参数检测逻辑和将设置mainFrame抽离添加到Answer实例方法上
  - 增加章节数的对象数组并获取每个章节的题目总数
- 2017.5.12补充
  - 对构造函数的默认参数处理进行重新编码和优化，支持多种调用方式: 1. 自主设置配置参数(可设置部分) 2. 不传参(采用默认参数)
- 2017.5.26补充
  - 将执行代码进行单独模块化抽离
  - 对代码的编码和注释进行检查
  - 添加了一个新的功能性需求
- 2017.6.5补充
  - 完成自定义刷题章节数的功能
  - 完成自定义正确率的功能
  - 添加script.min.js
  - 刷题结束的刷题统计功能





## 说明

---

**该脚本适用浏览器版本：http://caniuse.com/#search=Promise**

**C++题库自动刷题脚本源代码完全开源，后续会对问题进行解决和完善，但不再进行版本更新**



## 疑问或问题

---

有任何疑问、问题或需要完善和补充的，都可以在[issue](https://github.com/wupengju/The-question-bank-script/issues)中提出来，我会第一时间解决。