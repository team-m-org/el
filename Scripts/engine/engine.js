$.ajax({
	url : 'imsmanifest.xml',
	success : function(response){
		var obj = XML2jsobj(response);
		console.log(obj);
	}
})