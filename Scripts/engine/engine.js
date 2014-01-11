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
	var USERSTATE = {
			module : 0,
			topic : 0
	};
	var templatesCache = {

	};
	var topicDataCache = {

	};

	function normalizeCourse(courseStructure){
		for(var index in courseStructure.course.module){
			if(!(courseStructure.course.module[index].topic instanceof Array)){
				courseStructure.course.module[index].topic = [courseStructure.course.module[index].topic];
			}
		}
		return courseStructure;
	}
	
	function getCourseStructure(){
		return $.ajax({
			url : EnvVariables.paths['Data'] + "/" +EnvVariables['lang']+  '/structure.xml',  
			success : function(response){
				courseStructure = normalizeCourse(xml2jsonObj(response.childNodes[0]));
				console.log("Structure " , courseStructure);
			}
		});
	};


	function renderTopic(template, topicData){
		console.log("=======",JSON.stringify(topicData),"====");
		console.log("topicData=====",topicData,"template==",template);
		
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
			console.log('returning differed getTemplateData');
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
			console.log('returning differed getTopicData');
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

	showTopic =  function(){
		var topic = courseStructure.course.module[USERSTATE.module].topic[USERSTATE.topic];

		var topicTemplateId = topic.screen['_templateID'];
		var templateDataId = topic.screen['_xmlName'];

		var templatePromise = getTemplateData(topicTemplateId);
		var topicDataPromise = getTopicData(templateDataId);


		return $.when(templatePromise, topicDataPromise).then(function(){
			var template = templatesCache[topicTemplateId];
			var topicData = topicDataCache[templateDataId];
			//console.log('render topic here', template, topicData);
			renderTopic(template, topicData);
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
			return topicHandler.call(this);
		});

		$(".accordion").on("click","a",function(){
			return moduleHandler.call(this);
		});
	};

	moduleHandler = function(){
		console.log("Module ID - ", $(this).attr("class"));
		var menuType = courseStructure.course["_menuType"];
		if(menuType === "module"){
			USERSTATE.module = parseInt($(this).attr("class"));
			USERSTATE.topic = 0;
			$('#menu-panel').foundation('reveal', 'close');
			showTopic();
			updatePagination();
			return false;
		}
		
	};

	topicHandler = function(){

		USERSTATE.module =  parseInt($(this).attr("class").split("-")[0]);
		USERSTATE.topic =  parseInt($(this).attr("class").split("-")[1]);
		$('#menu-panel').foundation('reveal', 'close');
		showTopic();
		updatePagination();
	};

	updatePagination = function(){

		var modules = courseStructure.course.module;
		var topics = modules[USERSTATE.module].topic;
		$('.curr-page').text(USERSTATE.topic+1);
		$('.total-page').text(topics.length);
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
		console.log("Glossary Click");
	};

	prevHandler = function(){
		console.log("Previous Click");
		showPrevPage();
	};

	nextHandler = function(){
		console.log("Next Click");
		showNextPage();
	};

	helpHandler = function(){
		console.log("Help Click");
	};

	exitHandler = function(){
		console.log("Exit Click");
		var bool =  confirm("Are you sure you want to exit");
		if(bool){
			//TODO: unload window 
		}
	};



	showNextPage = function(){
		var modules = courseStructure.course.module;
		var currentModule = modules[USERSTATE.module];
		var currentTopic = modules[USERSTATE.module].topic[USERSTATE.topic];

		var nextTopic = ++USERSTATE.topic ;

		var moudlesLength = modules.length;
		if(nextTopic > currentModule.topic.length-1){
			USERSTATE.topic = nextTopic = currentModule.topic.length-1;
			USERSTATE.module++; 
			if(USERSTATE.module > moudlesLength-1){
				USERSTATE.module =  moudlesLength-1;
				return;
			}
			USERSTATE.topic = nextTopic = 0;
		}


		var topics = modules[USERSTATE.module].topic;
		if(USERSTATE.module === moudlesLength-1 &&  USERSTATE.topic === topics[USERSTATE.topic].length-1){
			//TODO disable next button
		} else {
			//TODO enable next button
		}
		showTopic();
		updatePagination();
	};

	initView = function(){
		var modules = courseStructure.course.module;
		var topics = modules[USERSTATE.module].topic;
		$('.curr-page').text(USERSTATE.topic+1);
		$('.total-page').text(topics.length);
		generateMenu(modules);
	};

	generateMenu = function(modules){

		var moduleArray=[];		
		for(var i=0;i<modules.length;i++){
			var moduleObj= {
					id:"",
					name: "",
					topics:[],
			};

			moduleObj.id = i;
			moduleObj.name = modules[i]["_title"];
			var topicLength = modules[i].topic.length;

			for(var j=0;j<topicLength;j++){
				var topicObj = {
						id:'',
						name:''
				};
				topicObj.id = i+"-"+j;
				topicObj.name = modules[i].topic[j]["_title"];
				moduleObj.topics.push(topicObj);
			}

			moduleArray.push(moduleObj);
		}

		var templatePromise = getTemplateData("menuTemplate.html","engine");
		$.when(templatePromise).then(function(){
			var template = templatesCache["menuTemplate.html"];
			$(".accordion").append(Handlebars.compile(template)(moduleArray));
		});
	};


	showPrevPage = function(){
		var currentModule = courseStructure.course.module[USERSTATE.module];
		var currentTopic = courseStructure.course.module[USERSTATE.module].topic[USERSTATE.topic];
		var prevTopic = --USERSTATE.topic;
		if(prevTopic < 0){
			USERSTATE.topic = prevTopic = 0;
			USERSTATE.module--; 
			if(USERSTATE.module<0){
				USERSTATE.module = 0;
				return;
			}
			USERSTATE.topic = prevTopic = courseStructure.course.module[USERSTATE.module].topic.length - 1;
		}

		if(USERSTATE.module === 0 && USERSTATE.topic===0){
			//TODO disable back button
		} else {
			//TODO enable back button
		}

		showTopic();
		updatePagination();
	};


	return {
		initialize : function(){
			var courseStructureObtained = getCourseStructure();
			$.when(courseStructureObtained).then(function(){
				showTopic();
				initView();
			});

			registerEvents();
		},
		showNextPage : showNextPage,
		showPrevPage : showPrevPage,
	}
})();


Engine.initialize();
