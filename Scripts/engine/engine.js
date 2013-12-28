//TODO : Derive this from config.xml
var EnvVariables = {
		'Data' : 'Data',
		'Templates' : 'Templates',
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
			url : EnvVariables['Data'] + "/" +EnvVariables['lang']+  '/structure.xml',  
			success : function(response){
				courseStructure = xml2jsonObj(response.childNodes[0]);
			}
		});
	}
	
	
	function renderTopic(){
		
	}
	
	function getTemplateData(templateId){
		if(templatesCache[templateId]){
			var differed = $.Deferred();
			console.log('returning differed getTemplateData');
			return differed.resolve();
		}
		return $.ajax({
			url : EnvVariables['Templates'] + "/" +EnvVariables['lang']+  "/" + templateId,  
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
			url : EnvVariables['Data'] + "/" +EnvVariables['lang']+  "/" + topicDataId,  
			success : function(response){
				topicDataCache[topicDataId] = response;
			}
		});
	}
	
	showTopic =  function(){
		var topic = courseStructure.course.module[USERSTATE.module].topic[USERSTATE.topic];


		var topicTemplateId = topic.screen['@templateID'];
		var templateDataId = topic.screen['@xmlName'];
		
		var templatePromise = getTemplateData(topicTemplateId);
		var topicDataPromise = getTopicData(templateDataId);
		
		//renderTopic();
		
		return $.when(templatePromise, topicDataPromise).then(function(){
			var template = templatesCache[topicTemplateId];
			var topicData = topicDataCache[templateDataId];
			console.log('render topic here', template, topicData);
		});
	};
	
	return {
		initialize : function(){
			var courseStructureObtained = getCourseStructure();
			$.when(courseStructureObtained).then(function(){
				showTopic();
			})
			
		}
	}
})();


Engine.initialize();
