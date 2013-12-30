//TODO : Derive this from config.xml
var EnvVariables = {
		paths : {
			'Data' : 'Data',
			'Templates' : 'Templates'
		},
		'lang' : 'eng'
}
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
	
	function getCourseStructure(){
		return $.ajax({
			url : EnvVariables.paths['Data'] + "/" +EnvVariables['lang']+  '/structure.xml',  
			success : function(response){
				courseStructure = xml2jsonObj(response.childNodes[0]);
			}
		});
	}
	
	
	function renderTopic(template, topicData){
		$(".template-conatiner").html( Handlebars.compile(template)(topicData));
	}
	
	function getTemplateData(templateId){
		if(templatesCache[templateId]){
			var differed = $.Deferred();
			console.log('returning differed getTemplateData');
			return differed.resolve();
		}
		return $.ajax({
			url : EnvVariables.paths['Templates'] + "/" +EnvVariables['lang']+  "/" + templateId,  
			success : function(response){
				templatesCache[templateId] = response;
			}
		});
	}
	
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
	}
	
	showTopic =  function(){
		var topic = courseStructure.course.module[USERSTATE.module].topic[USERSTATE.topic];


		var topicTemplateId = topic.screen['@templateID'];
		var templateDataId = topic.screen['@xmlName'];
		
		var templatePromise = getTemplateData(topicTemplateId);
		var topicDataPromise = getTopicData(templateDataId);
		
		
		return $.when(templatePromise, topicDataPromise).then(function(){
			var template = templatesCache[topicTemplateId];
			var topicData = topicDataCache[templateDataId];
			console.log('render topic here', template, topicData);
			renderTopic(template, topicData);
		});
	};
	
	return {
		initialize : function(){
			var courseStructureObtained = getCourseStructure();
			$.when(courseStructureObtained).then(function(){
				showTopic();
			})
		},
		showPrevPage : function(){
			var currentModule = courseStructure.course.module[USERSTATE.module];
			var currentTopic = courseStructure.course.module[USERSTATE.module].topic[USERSTATE.topic];
			var prevTopic = --USERSTATE.topic ;
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
		},
		showNextPage : function(){
			var modules = courseStructure.course.module;
			var currentModule = modules[USERSTATE.module];
			var currentTopic = modules[USERSTATE.module].topic[USERSTATE.topic];
			
			var nextTopic = ++USERSTATE.topic ;
			
			var moudlesLength = modules.length;
			if(nextTopic > currentModule.topic.length-1){
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
		}
	}
})();


Engine.initialize();
