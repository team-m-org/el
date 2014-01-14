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
		////console.log("=======",JSON.stringify(topicData),"====");
		////console.log("topicData=====",topicData,"template==",template);

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
			if((topic instanceof Array)){
				for(var topicIndex in topic){
					var screen = topic[topicIndex].screen;
					if(topic[topicIndex]._type=="assessment"){
						if((screen instanceof Array)){
							for(var screenIndex in screen){
								
								if(screen[screenIndex].isCorrect){
									assString += "1,";
								}
								else{
									assString += "0,";
								}
							}
							assString = assString.substring(0, assString.length-1);
							assString += "|";
						}
						
					}else{
						
						if((screen instanceof Array)){
							for(var screenIndex in screen){
								
								if(screen[screenIndex].visited){
									scromString  += "1,";
								}
								else{
									scromString  += "0,";
								}
							}
							scromString = scromString.substring(0, scromString.length-1);
							scromString += "^";
							
						}
						
						
						//scromString = scromString.substring(0, scromString.length-1);
						
					}
					
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
		var screens = topics.screen[USERSTATE.screen];
		
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
			
			alert("Submit Clicked");
		});
	};

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
	};

	menuModuleHandler = function(){
		//console.log("Module ID - ", $(this).attr("class"));
		var menuType = courseStructure.course["_menuType"];
		if(menuType === "module"){
			USERSTATE.module = parseInt($(this).attr("class"));
			USERSTATE.topic = 0;
			$('#menu-panel').foundation('reveal', 'close');
			showTopic();
			updatePagination();
			updateBreadCrum();


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
		updatePagination();
		updateBreadCrum();
		
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
		//console.log("Glossary Click");
	};

	prevHandler = function(){
		//console.log("Previous Click");
		showPrevPage();
	};

	nextHandler = function(){
		//console.log("Next Click");
		showNextPage();
	};



	helpHandler = function(){

		//console.log("Help Click");
	};

	exitHandler = function(){
		//console.log("Exit Click");
		var bool =  confirm("Are you sure you want to exit");
		if(bool){
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
		updatePagination();
		updateBreadCrum();
		//updateScromString();
	};
	
	/*updateScromString = function(){
		//console.log("scromString : " + scromString);
		
		console.log("Assessment : ",USERSTATE.assessment);
		
		var scromStringArray = scromString.split("~");
		
		if(USERSTATE.assessment){
			var module = scromStringArray[2].split("|");
			var tempScromString = "";
			
			for(var modelIndex in module){
				if(modelIndex == USERSTATE.module){
					var topics = module[modelIndex].split("^");
					var topicLevelString = "";
					for(var topicIndex in topics){
						
						if(topicIndex == USERSTATE.topic){
							var pages = topics[topicIndex].split(",");
							var tempTopicLevelString = "";
							for(var pageIndex in pages){
								if(pageIndex == USERSTATE.screen){
									tempTopicLevelString += ",1";
								}
								else{
									tempTopicLevelString += "," + pages[pageIndex];
								}
							}
							tempTopicLevelString += "^";
							tempTopicLevelString = tempTopicLevelString.substring(1, tempTopicLevelString.length);
							topicLevelString += tempTopicLevelString;
						}
						else{
							topicLevelString += topics[topicIndex] + "^";
						}
					}
					topicLevelString = topicLevelString.substring(0, topicLevelString.length-1);
					tempScromString += topicLevelString + "|";
				}
				else{
					tempScromString += module[modelIndex] + "|";
				}
			}
			tempScromString = tempScromString.substring(0, tempScromString.length-1);
			scromString = scromStringArray[0] + "~" + USERSTATE.module + "," + USERSTATE.topic + "," + USERSTATE.screen + "~" + tempScromString;
			
		}
		else{
			var module = scromStringArray[0].split("|");
			var tempScromString = "";
			
			for(var modelIndex in module){
				if(modelIndex == USERSTATE.module){
					var topics = module[modelIndex].split("^");
					var topicLevelString = "";
					for(var topicIndex in topics){
						
						if(topicIndex == USERSTATE.topic){
							var pages = topics[topicIndex].split(",");
							var tempTopicLevelString = "";
							for(var pageIndex in pages){
								if(pageIndex == USERSTATE.screen){
									tempTopicLevelString += ",1";
								}
								else{
									tempTopicLevelString += "," + pages[pageIndex];
								}
							}
							tempTopicLevelString += "^";
							tempTopicLevelString = tempTopicLevelString.substring(1, tempTopicLevelString.length);
							topicLevelString += tempTopicLevelString;
						}
						else{
							topicLevelString += topics[topicIndex] + "^";
						}
					}
					topicLevelString = topicLevelString.substring(0, topicLevelString.length-1);
					tempScromString += topicLevelString + "|";
				}
				else{
					tempScromString += module[modelIndex] + "|";
				}
			}
			
			tempScromString = tempScromString.substring(0, tempScromString.length-1);
			tempScromString += "~" + USERSTATE.module + "," + USERSTATE.topic + "," + USERSTATE.screen + "~" + scromStringArray[2];
			
			scromString = tempScromString;
		}
		
		
		
		console.log("scromString In Next : ", scromString);
		
	}*/

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
		updatePagination();
		updateBreadCrum();
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
			moduleObj.name = modules[i]["_title"];
			var topicLength = modules[i].topic.length;

			for(var j=0;j<topicLength;j++){
				var topicObj = {
						id:'',
						name:''
				};
				topicObj.id = i+"-"+j;
				topicObj.name = modules[i].topic[j]["_title"];
				modules[i].topic[j]["id"] = topicObj.id;
				moduleObj.topics.push(topicObj);
			}

			moduleArray.push(moduleObj);
		}

		
		$.when(templatePromise).then(function(){
			var template = templatesCache["menuTemplate.html"];
			$(".accordion").append(Handlebars.compile(template)(moduleArray));
			$(".completed").hide();
		});
	};


	showPrevPage = function(){
		var modules = courseStructure.course.module;
		var prevScreen = --USERSTATE.screen;

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
				
				initView();
				showTopic();
				//updateScromString();
			});

			registerEvents();

		},
		showNextPage : showNextPage,
		showPrevPage : showPrevPage,
	};
})();


Engine.initialize();
