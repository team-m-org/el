//TODO : Derive this from config.xml
var EnvVariables = {
		paths : {
			'Data' : 'Data',
			'Templates' : 'Templates',
			'EngineTemplate' : 'Scripts/engine/html/',
			'EngineImage' : 'Scripts/engine/image/'
		},
		'lang' : 'eng'
};


var Engine = (function(){
	var courseStructure = null;
	var scromString = "";
	var currTopicData = null;
	var currAttempt = 1;
	var currScore = 0;
	var keywords = [];
	var alphabets = [];
	var USERSTATE = {
			module : 0,
			topic : 0,
			screen : 0,
			assessment : false
	};
	var templatesCache = {

	};
	var topicDataCache = {

	};

	


	function normalizeCourse(courseStructure){

		if(!(courseStructure.course.module instanceof Array)){
			courseStructure.course.module = [courseStructure.course.module];
		}

		var modules = courseStructure.course.module;

		modules = modules.filter(function(element){
			return element._visible=="true";
		});

		for(var moduleIndex in modules){
			var module = modules[moduleIndex];

			var topics = module.topic;
			if(!(topics instanceof Array)){
				topics = module.topic = [topics];
			}
			topics  = module.topic = topics.filter(function(element){
				return element._visible=="true";
			});

			for(var topicIndex in topics){
				var screens = topics[topicIndex].screen;
				if(!(screens instanceof Array)){
					screens = topics[topicIndex].screen = [screens];
				}
				var screens = topics[topicIndex].screen  = screens.filter(function(element){
					return element._visible=="true";
				});		


			}

		}
		return courseStructure;
	}

	function createAssessment(topic){
		//console.log(topic);
		var noOfQuestionsMap = {};
		for(var index in topic){
			if(index.indexOf('_ques_set')!=-1){
				noOfQuestionsMap[index] = parseInt(topic[index], 10);
			}
		}

		var screensMap = {};
		for(var screenIndex in topic.screen){
			var screen = topic.screen[screenIndex];
			screensMap["_ques_set" + screen._setNo] = screensMap["_ques_set" + screen._setNo] ||[];
			screensMap["_ques_set" + screen._setNo].push(screen);
		}

		//console.log(noOfQuestionsMap);
		//console.log(screensMap);

		var calculatedScreens = [];
		for(var noOfQuestionsMapIndex in noOfQuestionsMap){
			var noOfQuestionsToPick = noOfQuestionsMap[noOfQuestionsMapIndex];
			var questionsScreens  = screensMap[noOfQuestionsMapIndex];
			calculatedScreens.push.apply(calculatedScreens, questionsScreens.sort(function(){ 
				return Math.round(Math.random())-0.5;
			}).slice(0,noOfQuestionsToPick));
		}
		topic.screen = calculatedScreens;

		return topic;
	}

	function constructCourse(courseStructure){
		var modules = courseStructure.course.module;
		for(var index in modules){
			var module = modules[index];
			for(var topicIndex in module.topic){
				if(module.topic[topicIndex]._type==="assessment"){
					module.topic[topicIndex] = createAssessment(module.topic[topicIndex]);
				}
			}
		}
		return courseStructure;
	}

	function getCourseStructure(){
		return $.ajax({
			url : EnvVariables.paths['Data'] + "/" +EnvVariables['lang']+  '/structure.xml',  
			success : function(response){

				var normalizedCourse = normalizeCourse(xml2jsonObj(response.childNodes[0]));
				courseStructure = constructCourse(normalizedCourse);

			}
		});
	};


	function renderTopic(template, topicData){
		currTopicData = topicData;
		$(".template-conatiner").html( Handlebars.compile(template)(topicData));
		if(topicData["Instruction"] !== undefined){
			$("h3").html(topicData["Instruction"]);
		}
		else{
			$(".intruction-div").hide();
		}
	};

	function getTemplateData(templateId,templateType){
		if(templatesCache[templateId]){
			var differed = $.Deferred();
			////console.log('returning differed getTemplateData');
			return differed.resolve();
		}
		return $.ajax({
			url : templateType !== "engine" ? EnvVariables.paths['Templates'] + "/" +EnvVariables['lang']+  "/" + templateId : EnvVariables.paths['EngineTemplate']  + templateId,  
					success : function(response){
						templatesCache[templateId] = response;
					}
		});
	};


	function getTopicData(topicDataId){
		if(topicDataCache[topicDataId]){
			////console.log('returning differed getTopicData');
			var differed = $.Deferred();
			return differed.resolve();
		}
		return $.ajax({
			url : EnvVariables.paths['Data'] + "/" +EnvVariables['lang']+  "/" + topicDataId,  
			success : function(response){
				topicDataCache[topicDataId] = xml2jsonObj(response);
			}
		});
	};


	function renderAssesment(template, assessmentData){

		assessmentStructure =  assessmentData;
		USERSTATE['mode'] = "assessment";
		data['assessment'] = assessmentData.topic;

		showTopic();

	}

	updateScromString =  function(){
		var assString = "";
		scromString = "";
		var module = courseStructure.course.module;
		for(var index in module){
			var topic = module[index].topic;
				for(var topicIndex in topic){
					var screen = topic[topicIndex].screen;
					if(topic[topicIndex]._type=="assessment"){
							for(var screenIndex in screen){
								
								if(screen[screenIndex].isCorrect){
									assString += "1,";
								} else {
									assString += "0,";
								}
							}
							assString = assString.substring(0, assString.length-1);
							assString += "|";
					}else{
							for(var screenIndex in screen){
								if(screen[screenIndex].visited){
									scromString  += "1,";
								} else {
									scromString  += "0,";
								}
							}
							scromString = scromString.substring(0, scromString.length-1);
							scromString += "^";
					}
				}
			scromString = scromString.substring(0, scromString.length-1);
			scromString += "|";
		}
		scromString = scromString.substring(0, scromString.length-1);
		assString = assString.substring(0, assString.length-1);
		var currentPosition = USERSTATE.module + "," + USERSTATE.topic + "," + USERSTATE.screen;
		scromString += "~" + currentPosition + "~" + assString;
		console.log(scromString);
		updateSCORM(scromString);
		
	}
	
	updateCourseState = function(scormString){
		//1,1|0,0,0|0,0,0~0,0,1~0,0,0 
		if(!scormString){
			return;
		}
		var parts = scormString.split("~");
		var courseStateStr = parts[0];
		var currentPositionStr = parts[1];
		var assScoreStr = parts[2];
		
		
		
		
		function calculateCourse(courseStateStr){
			var calculatedCourse = {};
			var moduleParts = courseStateStr.split("|");
			
			calculatedCourse['module'] = new Array(moduleParts.length);

			for(var modulePartIndex in moduleParts){

				var moduleStr = moduleParts[modulePartIndex];
				var topicParts = moduleStr.split("^");
				calculatedCourse['module'][modulePartIndex] ={ topic : new Array(topicParts.length)} ;
				for(var topicPartIndex in topicParts){
					var topicStr =  topicParts[topicPartIndex];
					var screenParts = topicStr.split(",");
					calculatedCourse['module'][modulePartIndex]['topic'][topicPartIndex] = { screen : new Array(screenParts.length)};
					for(var screenPartIndex in screenParts){
						var screenStr = screenParts[screenPartIndex];
						calculatedCourse['module'][modulePartIndex]['topic'][topicPartIndex]['screen'][screenPartIndex]=screenStr=="1";
					}
				}
			}
			return calculatedCourse;
		}
		
		
		var calculatedCourse = calculateCourse(courseStateStr);
		var calculatedAssessment = calculateCourse(assScoreStr);
		
		var modules= courseStructure.course.module;
		var calculatedModule = calculatedCourse.module;
		
		var calculatedAssessmentMoudles =  calculatedAssessment.module;

		/*var sortedCourse = {module : []};
		var sortedAssessment = {module : []};*/
		
		var moduleTopics = [];
		var assessmentTopics = [];
		
		for(var index in calculatedCourse.module){
			var topics = calculatedCourse.module[index]['topic'];
			for(var topicIndex in topics){
				moduleTopics.push(topics[topicIndex]);
			}
		}
		
		for(var index in calculatedAssessmentMoudles){
			var topics = calculatedAssessmentMoudles[index]['topic'];
			for(var topicIndex in topics){
				assessmentTopics.push(topics[topicIndex]);
			}
		}
		
		var asseessmentTopicIndex = 0;
		var moduleTopicsTopicIndex = 0;
		for(var index in modules){
			var topics = modules[index]['topic'];
			for(var topicIndex in topics){
				if(topics[topicIndex]._type == "assessment"){
					var assessaentTopicWithData = assessmentTopics[asseessmentTopicIndex++];
					for(var screenIndex in screens){
						screens[screenIndex].isCorrect = assessaentTopicWithData.screen[screenIndex];
					}

				} else {
					var moduleTopicWithData = moduleTopics[moduleTopicsTopicIndex++];
					var screens = topics[topicIndex]['screen'];
					for(var screenIndex in screens){
						screens[screenIndex].visited = moduleTopicWithData.screen[screenIndex];
					}
				}
			}
		}
		
		function setVisitedModules(course){
			var modules = course.module;
			
			for(var moduleIndex in modules){
				var currentModule = modules[moduleIndex];
				var moduleCompleted = true;
				
				for(var topicIndex in currentModule.topic){
					if(!currentModule.topic[topicIndex].completed){
						moduleCompleted = false;
						break;
					}	
				}
				currentModule.completed = moduleCompleted;
				currentModule.visited = moduleCompleted;
			}
		}
		
		function setVisitedTopics(course){
			var modules = course.module;
			
			for(var moduleIndex in modules){
				var currentModule = modules[moduleIndex];
				var moduleCompleted = true;
				
				for(var topicIndex in currentModule.topic){
					var currentTopic = currentModule.topic[topicIndex];
					var topicCompleted = true;
					for(var screenIndex in currentTopic.screen){
						var currentScreen = currentTopic.screen[topicIndex];
						if(!currentScreen.visited){
							topicCompleted = false;
							break;
						}
					}
					currentTopic.completed = topicCompleted;
					currentTopic.visited = topicCompleted;
				}
			}
		}
		
		
		setVisitedTopics(courseStructure.course);
		setVisitedModules(courseStructure.course);
		
		
		
		var currentPositionParts = currentPositionStr.split(',');
		
		var currentModule = parseInt(currentPositionParts[0], 10);
		var currentTopic = parseInt(currentPositionParts[1], 10);
		var currentScreen = parseInt(currentPositionParts[2], 10);
		
		USERSTATE = $.extend(USERSTATE, {
			module : currentModule,
			topic : currentTopic,
			screen : currentScreen
		});
		
	}
	
	updateSCORM = function(scromString){
		doLMSSetValue('cmi.suspend_data', scromString);
		doLMSCommit('');
		
	};
	
	getSCORMData = function(){
		var scormString = doLMSGetValue('cmi.suspend_data');
		return scormString;
	}
	
	showTopic =  function(){

		var module = courseStructure.course.module[USERSTATE.module];
		var topics =  module.topic[USERSTATE.topic];
		var screens = topics.screen[USERSTATE.screen];
		
		var lockNext = screens['_lockNext'];
		console.log("lock :", lockNext);
		
		if(lockNext == "true"){
			console.log("lock is true : ", lockNext);
			$("#next").addClass("disableNavigation");
			$("#next").off("click");
		}
		
		
		screens.visited=true;
		topics.visited=true;
		module.visited=true;
		
		var topicTemplateId = screens['_templateID'];
		var templateDataId = screens['_xmlName'];

		var templatePromise = getTemplateData(topicTemplateId);
		var topicDataPromise = getTopicData(templateDataId);

		updateScromString();
		updatePagination();
		updateBreadCrum();

		return $.when(templatePromise, topicDataPromise).then(function(){
			var template = templatesCache[topicTemplateId];
			var topicData = topicDataCache[templateDataId];
			//console.log('render topic here', template, topicData);
			renderTopic(template, topicData);
			checkAssessment();
		});
	};
	
	checkAssessment = function(){
		var module = courseStructure.course.module[USERSTATE.module];
		var topics =  module.topic[USERSTATE.topic];
		
		if(topics["_type"] === "assessment"){
			USERSTATE.assessment = true;
			verifyAssessment();
		}
		else{
			USERSTATE.assessment = false;
			return;
		}
		
	};
	
	verifyAssessment = function (){
		$('.btnSubmit').on('click',function(){
			
		
			
			
			

	    	var c_flag = false;
	    	$(".error").html('');
	    	$("input[class='option']:checked").each(function() { 
	    		c_flag = true;
	    		
	    	});
	    	var currScreen = getCurrentScreen();
	    	var currentTopic = getCurrentTopic();
	    	console.log("currScreen.attempt " ,currScreen.attempt);
	    	if(c_flag===true){
	    		
	    		var count = 0;
	    		if(currTopicData.type === "mcq"){
	    			var ans = $("input[class='option']:checked");
	    			var corranswers = currTopicData.correctAnswer.split(",");
	    			for(var i=0;i<ans.length;i++){
	    				for(var j=0;j<corranswers.length;j++){
	    					console.log("Ans " + $(ans[i]).val());
	    					console.log("Cans " + corranswers[j]);
		    				if($(ans[i]).val() === corranswers[j]){
		    					count ++;
		    					break;
		    				}
		    			}
	    			}
	    			
	    			if(count === ans.length){
	    				currScreen.isCorrect = true;
	    				currScore ++;
	    				if(USERSTATE.screen ===  currentTopic.screen.length-1){
	    					showResult(currentTopic.screen.length);
	    					return;
	    				}
	    				Engine.showNextPage();
	    				return;
	    			}
	    			else{
	    				currScreen.isCorrect = false;
	    				$(".error").html("Try again !.").slideDown();
	    			}
	    			
	    			if(parseInt(currScreen._attempt) === currAttempt){
	    				Engine.showNextPage();
	    				return;
	    			}
	    		}
	    		else if(currTopicData.type === "saq"){
	    			var ans = $("input[class='option']:checked").val();
	    			var corranswers = currTopicData.correctAnswer;
	    			
	    			if(corranswers === ans){
	    				currScreen.isCorrect = true;
	    				currScore ++;
	    				if(USERSTATE.screen ===  currentTopic.screen.length-1){
	    					showResult(currentTopic.screen.length);
	    					return;
	    				}
	    				Engine.showNextPage();
	    				return;
	    				
	    			}
	    			else{
	    				currScreen.isCorrect = false;
	    				$(".error").html("Try again !.").slideDown();
	    			}
	    			
	    			if(parseInt(currScreen._attempt) === currAttempt){
	    				if(USERSTATE.screen ===  currentTopic.screen.length-1){
	    					$('.template-conatiner').html("");
	    					showResult(currentTopic.screen.length);
	    					return;
	    				}
	    				Engine.showNextPage();
	    				return;
	    			}
	    		}
	    		
	    		
	    		
	    		currAttempt++;
	    	}else{
	    		$(".error").html("Please select atleast one option.").slideDown();
	    	}
		
		});
		
		
	};
	
	showResult = function(total){
		$('.template-conatiner').html("<div class='asses-result'>Result " + currScore + " out of " + total + "</div>");
	}

	registerEvents = function(){

		$("ul.inline-list").on("mouseenter","img",function(){
			return rollOverHandler.call(this);
		});

		$("ul.inline-list").on("mouseleave","img",function(){
			return rolloutHandler.call(this);
		});

		$("ul.inline-list li[id='playpause']").on("click", function() {
			return playpauseHandler.call(this);
		});

		$("ul.inline-list li[id='menu']").on("click", function() {
			return menuHandler.call(this);
		});

		$("ul.inline-list li[id='glossary']").on("click", function() {
			return glossaryHandler.call(this);
		});
		
		$("ul.inline-list li[id='help']").on("click", function() {
			return helpHandler.call(this);
		});

		$("ul.inline-list li[id='prev']").on("click", function() {
			return prevHandler.call(this);
		});

		$("ul.inline-list li[id='next']").on("click", function() {
			return nextHandler.call(this);
		});

		$("ul.inline-list li[id='help']").on("click", function() {
			return nextHandler.call(this);
		});

		$("ul.inline-list li[id='exit']").on("click", function() {
			return exitHandler.call(this);
		});

		$(".accordion").on("click","li",function(){
			return menuTopicHandler.call(this);
		});

		$(".accordion").on("click","a",function(){
			return menuModuleHandler.call(this);
		});
		
		
		
		$(window).unload(function(){
			console.log("Unload Called");
			updateScromString();
			doLMSFinish();
		});
		
		$(document).on('click','.label-container .letter a',function(){
			return glossaryLetterHandler.call(this);
		});
		
		$(document).on('click','.words-conatiner .word a',function(){
			return glossaryWordHandler.call(this);
		});
		
		$(document).on('click', '.template-conatiner .btnSubmit',function () {});
	};
	
	glossaryWordHandler = function(){
		var word = $(this).text();
		var keyObj = getDescForWord(word);
		var template2 = templatesCache["glossaryDesc.html"];
		$(".desc-container").html(Handlebars.compile(template2)(keyObj));
	};
	
	
	glossaryLetterHandler = function(){
		var key = $(this).parent().data('id');
		var words = getWordsForID(key);
		var keyObj = getDescForWord(words[0].word._cdata);
		var template1 = templatesCache["glossaryWord.html"];
		var template2 = templatesCache["glossaryDesc.html"];
		$(".words-conatiner").html(Handlebars.compile(template1)(words));
		$(".desc-container").html(Handlebars.compile(template2)(keyObj));
	};
	
	getCurrentTopic = function(){
		var module = courseStructure.course.module[USERSTATE.module];
		var currtopics =  module.topic[USERSTATE.topic];
		return currtopics;
	};
	
	getCurrentScreen = function(){
		var module = courseStructure.course.module[USERSTATE.module];
		var topics =  module.topic[USERSTATE.topic];
		var currScreen =  topics.screen[USERSTATE.screen];
		return currScreen;
	};
	menuModuleHandler = function(){
		var menuType = courseStructure.course["_menuType"];
		if(menuType === "module"){
			USERSTATE.module = parseInt($(this).attr("class"));
			USERSTATE.topic = 0;
			$('#menu-panel').foundation('reveal', 'close');
			showTopic();
			var modules = courseStructure.course.module;
			var topics = modules[USERSTATE.module].topic;

			if(USERSTATE.module === 0 && USERSTATE.topic===0){
				$('#prev').addClass('disableNavigation');
				$('#next').removeClass('disableNavigation'); 
			}
			else if(USERSTATE.module === modules.length-1 && USERSTATE.topic === topics.length-1 ){
				$('#prev').removeClass('disableNavigation');
				$('#next').addClass('disableNavigation'); 
			}
			else{
				$('#prev').removeClass('disableNavigation');
				$('#next').removeClass('disableNavigation'); 
			}

			return false;
		}

	};

	menuTopicHandler = function(){

		if(courseStructure.course._navigationMode == "linear"){
			if(courseStructure.course.module[parseInt($(this).attr("class").split("-")[0])].topic[parseInt($(this).attr("class").split("-")[1])].visited){
				console.log("This topic has been visited");
			}
			else{
				console.log("This topic has not been visited");
				return;
			}
		}
		
		USERSTATE.module =  parseInt($(this).attr("class").split("-")[0]);
		USERSTATE.topic =  parseInt($(this).attr("class").split("-")[1]);
		USERSTATE.screen = 0; 
		$('#menu-panel').foundation('reveal', 'close');

		console.log("USERSTATE.topic : " + USERSTATE.topic);
		console.log("USERSTATE.module : " + USERSTATE.module);
		console.log("USERSTATE.topic : " + courseStructure.course.module[USERSTATE.module].topic[USERSTATE.topic].visited);
		
		showTopic();
		var modules = courseStructure.course.module;
		var topics = modules[USERSTATE.module].topic;
		
		if(USERSTATE.module === 0 && USERSTATE.topic===0){
			$('#prev').addClass('disableNavigation');
			$('#next').removeClass('disableNavigation'); 
		}
		else if(USERSTATE.module === modules.length-1 && USERSTATE.topic === topics.length-1 ){
			$('#prev').removeClass('disableNavigation');
			$('#next').addClass('disableNavigation'); 
		}
		else{
			$('#prev').removeClass('disableNavigation');
			$('#next').removeClass('disableNavigation'); 
		}


	};

	updatePagination = function(){

		var modules = courseStructure.course.module;
		var topics = modules[USERSTATE.module].topic;
		var screens = topics[USERSTATE.topic].screen;
		if(screens instanceof Array){
			$('.curr-page').text(USERSTATE.screen+1);
			$('.total-page').text(screens.length);	
		}
		else{
			$('.curr-page').text(1);
			$('.total-page').text(1);
		}

	};

	rollOverHandler = function(){
		var srcName = $(this).attr("src").split(".")[0].split("/")[3];
		var imageSrc = EnvVariables.paths['EngineImage'] + srcName + "_over.png";
		$(this).attr("src", imageSrc);
	};

	rolloutHandler = function(){
		var srcName = $(this).attr("src").split(".")[0].split("/")[3].split("_")[0];
		var imageSrc = EnvVariables.paths['EngineImage'] + srcName + ".png";
		$(this).attr("src", imageSrc);
	};

	playpauseHandler = function () {
		var imgObj = $(this).find('img');
		var status = $(imgObj).attr("src").split(".")[0].split("/")[3]
		.split("_")[0];
		status === "play" ? $(imgObj).attr({
			"src" : EnvVariables.paths['EngineImage'] + "pause.png",
			"title" : "Pause"
		}) : $(imgObj).attr({
			"src" : EnvVariables.paths['EngineImage'] + "play.png",
			"title" : "Play"
		});
	};

	menuHandler = function(){
		console.log("Menu Click");
	};

	glossaryHandler = function(){
		
	};
	
	getWordsForID = function(id){
		var idKeyWords = [];
		for (var int = 0; int < keywords.length; int++) {
			if(id == keywords[int]._id){
				idKeyWords.push(keywords[int]);
			}
		}
		
		return idKeyWords;
	};
	
	getDescForWord = function(word){
		var desc = "";
		for (var int = 0; int < keywords.length; int++) {
			if(word == keywords[int].word._cdata){
				desc = keywords[int];
				break;
			}
		}
		
		return desc;
	};

	prevHandler = function(){
		showPrevPage();
	};

	nextHandler = function(){
		showNextPage();
	};



	helpHandler = function(){
		
	};

	exitHandler = function(){
		var bool =  confirm("Are you sure you want to exit");
		if(bool){
			updateScromString();
			doLMSFinish();
			window.open('', '_self', '');
			window.close();
			
		}
	};



	showNextPage = function(){
		var modules = courseStructure.course.module;
		var currentModule = modules[USERSTATE.module];
		var currentTopic = modules[USERSTATE.module].topic[USERSTATE.topic];
		var nextScreen = ++USERSTATE.screen;
		var moudlesLength = modules.length;
		
		currAttempt = 1;
		
		if(nextScreen > currentTopic.screen.length-1){
			USERSTATE.screen = nextScreen = currentTopic.screen.length-1;
			setCompleted(currentTopic);
			currentTopic.completed=true;
			USERSTATE.topic++;
			var moduleCompleted = true;
			for(var topicIndex in currentModule.topic){
				if(!currentModule.topic[topicIndex].completed){
					moduleCompleted = false;
					break;
				}	
			}
			if(moduleCompleted){
				setModuleCompleted(currentModule);
			}
			if(USERSTATE.topic > currentModule.topic.length-1){
				USERSTATE.topic =  currentModule.topic.length-1;
				
				USERSTATE.module++;
				if(USERSTATE.module > moudlesLength-1){
					USERSTATE.module = moudlesLength-1;
					return;
				}

				USERSTATE.topic  = 0;
			}
			USERSTATE.screen = nextScreen = 0;
		}
		
		
		modules[USERSTATE.module].topic[USERSTATE.topic]["_type"] === "assessment" ? USERSTATE.assessment=true:USERSTATE.assessment=false;
		
	
		updateNextNavigation();
		showTopic();
		
		
	};
	
	
	updateNextNavigation = function(){
		var modules = courseStructure.course.module;
		var currentModule = modules[USERSTATE.module];
		var topics = modules[USERSTATE.module].topic;
		if(USERSTATE.module === modules.length-1 &&  USERSTATE.topic === currentModule.topic.length-1 && USERSTATE.screen === topics[USERSTATE.topic].screen.length-1){
			$('#next').addClass('disableNavigation');
			$('#prev').removeClass('disableNavigation');
		} else {
			$('#prev').removeClass('disableNavigation'); 
		}

	};

	updatePrevNavgation = function(){
		if(USERSTATE.module === 0 && USERSTATE.topic === 0 && USERSTATE.screen === 0){
			$('#prev').addClass('disableNavigation');
			$('#next').removeClass('disableNavigation'); 
		}
		else{
			$('#next').removeClass('disableNavigation'); 
		}
	};


	initView = function(){
		
		var modules = courseStructure.course.module;
		generateMenu(modules);
		genrateHelp();
		genrateGlossary();
		updateNextNavigation();
		updatePrevNavgation();
		$('.course-title').text(courseStructure.courseTitle._cdata);
	};

	updateBreadCrum = function(){
		var modules = courseStructure.course.module;
		var topics = modules[USERSTATE.module].topic;
		var screen =  topics[USERSTATE.topic].screen;
		var screenTitle = "";
		$('.module-name').text(modules[USERSTATE.module]["_title"]);
		$('.module-topic').text(topics[USERSTATE.topic]["_title"]);
		(screen instanceof Array) ? screenTitle = screen[USERSTATE.screen]["_title"] : screenTitle = screen["_title"];
		$('.module-screen').text(screenTitle);

	};
	
	genrateHelp = function (){
		var templatePromise = getTemplateData("help.html","engine");
		var helpData = getTopicData("help.xml");
		$.when(templatePromise,helpData).then(function(){
			var template = templatesCache["help.html"];
			var helpContent = topicDataCache["help.xml"];
			
			$(".help-container").html(Handlebars.compile(template)(helpContent.items));
			
		});
	};
	
	genrateGlossary = function(){
		var templatePromise = getTemplateData("glossary.html","engine");
		var template1Promise = getTemplateData("glossaryWord.html","engine");
		var template2Promise = getTemplateData("glossaryDesc.html","engine");
		var glossaryData = getTopicData("glossary.xml");
		$.when(templatePromise,glossaryData,template1Promise,template2Promise).then(function(){
			var template = templatesCache["glossary.html"];
			var template1 = templatesCache["glossaryWord.html"];
			var template2 = templatesCache["glossaryDesc.html"];
			var glossaryContent = topicDataCache["glossary.xml"];
			
			keywords = glossaryContent.wordlist.keyword;
			letters = glossaryContent.alphabets.letter;
			
			for (var int = 0; int < keywords.length; int++) {
				for(var i = 0; i<letters.length;i++){
					if(keywords[int]._id === letters[i]._id ){
						alphabets.push(letters[i]);
						break;
					}
				}
			}
			
			var defaultId = keywords[0]._id;
				
			var glossayData={};
			glossayData.letters = _.uniq(alphabets);
			glossayData.keywords = getWordsForID(defaultId);
			glossayData.defaultDesc = keywords[0];
			
			$(".glossary-container").html(Handlebars.compile(template)(glossayData.letters));
			$(".words-conatiner").html(Handlebars.compile(template1)(glossayData.keywords));
			$(".desc-container").html(Handlebars.compile(template2)(glossayData.defaultDesc));
			
		});
	}

	generateMenu = function(modules){

		var templatePromise = getTemplateData("menuTemplate.html","engine");
		var moduleArray=[];		
		for(var i=0;i<modules.length;i++){
			var moduleObj= {
					id:"",
					name: "",
					topics:[],
			};

			moduleObj.id = i;
			modules[i]["id"]=i;
			moduleObj.completed= modules[i]["completed"];
			moduleObj.name = modules[i]["_title"];
			var topicLength = modules[i].topic.length;

			for(var j=0;j<topicLength;j++){
				var topicObj = {
						id:'',
						name:''
				};
				topicObj.id = i+"-"+j;
				topicObj.name = modules[i].topic[j]["_title"];
				topicObj.completed = modules[i].topic[j].completed;
				modules[i].topic[j]["id"] = topicObj.id;
				moduleObj.topics.push(topicObj);
			}

			moduleArray.push(moduleObj);
		}

		
		$.when(templatePromise).then(function(){
			var template = templatesCache["menuTemplate.html"];
			$(".accordion").append(Handlebars.compile(template)(moduleArray));
		});
	};


	showPrevPage = function(){
		var modules = courseStructure.course.module;
		var prevScreen = --USERSTATE.screen;
		currAttempt = 1;
		if(prevScreen < 0){
			USERSTATE.screen = prevScreen = 0;
			USERSTATE.topic--;
			if(USERSTATE.topic < 0){
				USERSTATE.topic = 0;
				USERSTATE.module--;
				if(USERSTATE.module < 0){
					USERSTATE.module = 0;
					return;
				}
				USERSTATE.topic  = modules[USERSTATE.module].topic.length-1;
			}
			USERSTATE.screen = prevScreen = modules[USERSTATE.module].topic[USERSTATE.topic].screen.length-1;
		}

		updatePrevNavgation();
		showTopic();
		updatePagination();
		updateBreadCrum();

	};

	setCompleted = function(topic){
		$("."+topic.id+".topicMenu").find("span").show();
	};
	
	setModuleCompleted = function(module){
		$("."+module.id+".moduleMenu").find("span").show();
	};

	
	return {
		initialize : function(){
			var courseStructureObtained = getCourseStructure();
			$.when(courseStructureObtained).then(function(){
				
				
				doLMSInitialize();
				var scormString = getSCORMData();
				updateCourseState(scormString);
				showTopic();
				initView();
			});

			registerEvents();

		},
		showNextPage : showNextPage,
		showPrevPage : showPrevPage,
	};
})();


Engine.initialize();

console = console || {};
console.log = function(){};