var isReduceWarning = false;
var isRemoveItems = false;

Template.levelDesigner.created = function(){
	
	updateCurrentLevel();
	selectALevel();
	

	Meteor.defer(function(){
		updateCurrentLevel();
		selectALevel();
		if(!Session.get("currentFeatureType"))Session.set("currentFeatureType", "terrain");
		Session.set("currentElement", DesignerGameDefs.findOne({type: Session.get("currentFeatureType"), 
									creator: Meteor.user()._id}));

	});


}



Template.terrainMap.events({


	'click .designerCell':function(e){

		if(checkClientIsOwner(Meteor.user()._id, Session.get("currentLevel"))){

			isReduceWarning = false;
			updateCurrentLevel();
			var loc = e.currentTarget.id.split("-");


			if(Session.get("currentFeatureType") == "entryPoint"){

				setSingularElement(loc);

			}else{

				setMultiElement(loc);
				
			}

			if(Session.get("currentFeatureType") == "pickupable"){
				updateLevelInventory();
			}



		}else{
				alert("You are not the creator of this level. \nMake a copy which you can edit");
		}
		
	}


});

function setSingularElement(loc){

	//check to see if there is already an element set
	var n_cell = DesignerGameMaps.findOne({type: 'cell', 
		levelId: Session.get("currentLevel")._id, 
		x: parseInt(loc[0]), y: parseInt(loc[1])});

	if(n_cell.entryPoint != 'none'){ //may need expanding if extra elements have same behaviour
		
		alert('this cell already has an entry point');
		return;

	}else{

		//clear the old cell
		var o_cell = DesignerGameMaps.findOne({type: 'cell', levelId: Session.get("currentLevel")._id, 
						entryPoint: Session.get("currentElement")});

		if(o_cell)DesignerGameMaps.update(o_cell._id, {$set: {entryPoint: 'none'}});


		//set the new one
		DesignerGameMaps.update(n_cell._id ,{$set:{entryPoint: Session.get("currentElement")}});

	}

}

function setMultiElement(loc){

	var cell = DesignerGameMaps.findOne({type: 'cell', 
	levelId: Session.get("currentLevel")._id, 
	x: parseInt(loc[0]), y: parseInt(loc[1])});


	var id = (isRemoveItems) ? 'none' : Session.get("currentElement")._id;
	var setObj = {};
	setObj[Session.get("currentFeatureType")] = id;
	DesignerGameMaps.update(cell._id ,{$set: setObj});

	updateKey();

}


Template.terrainMap.mapRow = function(){

	return DesignerGameMaps.find({
	type: 'cell', 
	levelId: Session.get("currentLevel")._id,
	 x: 0},
	 {sort: ["y", "asc"]}).fetch();
}

Template.terrainMap.mapCol = function(y){

	return DesignerGameMaps.find({
		type: 'cell', 
		levelId: Session.get("currentLevel")._id, 
		y: y},
		{sort: ["x", "asc"]}).fetch();
}


Template.terrainMap.hasEntryPoint = function(){return (this.entryPoint != 'none');}
Template.terrainMap.hasExitPoint = function(){return (this.exitPoint != 'none');}
Template.terrainMap.hasWall = function(){return (this.wall != 'none');}
Template.terrainMap.hasPickupable = function(){return (this.pickupable != 'none');}

Template.terrainMap.elementColor = function(e){

	var t = DesignerGameDefs.findOne(e);

	if(!t){
		return;
	}else{
		return t.color;
	}


}

Template.terrainMap.elementMapSymbol = function(e){

	var s = DesignerGameDefs.findOne(e);

	if(!s){
		return;
	}else{
		return s.mapSymbol;
	}


}




/*-----------------------------------------levelTable --------------------------------------------------*/

Template.levelTable.events({

	'click #copyLevel':function(e){

		isReduceWarning = false;

		var level = Session.get("currentLevel");
		makeLevelCopy(level.level, level.creator, level.level, Meteor.user()._id);
		Deps.flush();
		e.preventDefault();

	},

	'click #removeLevel':function(e){

		//safeties needed here
		if(confirm("are you sure you want to delete " + Session.get("currentLevel").level + "... " )){	

			var level = Session.get("currentLevel");

			//insert check for dependencies and alert message

			var ep = DesignerGameDefs.findOne({type: 'exitPoint', exitTo: Session.get("currentLevel")._id});

			if(ep){

				if(ep.creator != Meteor.user()._id){
					alert("Sorry I can't delete this because "  + getCreatorName(ep.creator) + " has linked to this level in their exitPoint " + ep.name 
						+ ". \nPlease ask them to remove this resource first.");
				}else{
					alert("Sorry I can't delete this because you have linked to this level in the exitPoint " + ep.name 
					+ ". \nPlease delete this resource first.");
				}

			}else{

				DesignerGameMaps.find({levelId: level._id}).forEach(function(cell){
					DesignerGameMaps.remove(cell._id);
				});

				DesignerGameMaps.remove(Session.get("currentLevel")._id, function(){
					Session.set("currentLevel", "");
					selectALevel();
				});

			}
			


  		}

  		isReduceWarning = false;

		e.preventDefault();
		
	},

	'click .levelRow':function(e){

		Session.set("currentLevel", DesignerGameMaps.findOne({type: 'levelHeader', _id: e.currentTarget.id}));

		isReduceWarning = false;

		$('.levelRow').removeClass('selected');
		$('.levelRow > td' ).removeClass('selected');
		$('#' + e.currentTarget.id + ' > td').removeClass('subSelected');
		$('#' + e.currentTarget.id).removeClass('subSelected');
		$('#' + e.currentTarget.id + ' > td').addClass('selected');
		$('#' + e.currentTarget.id).addClass('selected');


		if(checkClientIsOwner(Meteor.user()._id, Session.get("currentLevel"))){
			enableAdjustables();
		}else{
			disableAdjustables();
		}

	},

	'mouseenter .levelRow':function(e){

		var ct = DesignerGameMaps.findOne(e.currentTarget.id);

		$('.levelRow').removeClass('subSelected');
		$('.levelRow > td' ).removeClass('subSelected');

		if(ct._id != Session.get("currentLevel")._id){
			$('#' + ct._id + ' > td').addClass('subSelected');
			$('#' + ct._id).addClass('subSelected');
		}
	},

	'mouseleave .levelRow':function(e){

		$('.levelRow').removeClass('subSelected');
		$('.levelRow > td' ).removeClass('subSelected');

	}


});

/*-------------------------------------------mapKey-----------------------------------------------*/

Template.mapKey.elementsUsed = function(){

	var k = DesignerGameMaps.findOne(Session.get("currentLevel")._id).mapKey;
	return DesignerGameDefs.find({ _id: {$in: k} }, {fields: {color: 1, name: 1, type: 1, mapSymbol: 1}}).fetch();

}


/*--------------------------main settings ----------------------------------------------*/

Template.mainSettings.events({

	'click #levelWidth':function(e){

		var w = $('#levelWidth').val();
		updateCurrentLevel();
		var cl = Session.get("currentLevel");

		if(w > cl.width){

			for(var x = cl.width; x < w; x++){
				for(var y = 0; y < cl.height; y++){

					var cell = createMapCell(cl, x, y);
					DesignerGameMaps.insert(cell);
				}
			}

			DesignerGameMaps.update(cl._id, {$set:{width: parseInt(w)}});

			isReduceWarning = false;

		}else{

			if(!isReduceWarning){
				isReduceWarning = confirm("Data may be lost. Do you wish to continue ?");
			}

			if(isReduceWarning){

				DesignerGameMaps.find({levelId: cl.levelId, x: {$gte: parseInt(w)}}).forEach(function(cell){

					DesignerGameMaps.remove(cell._id);

				});
				DesignerGameMaps.update(cl._id, {$set:{width: parseInt(w)}});

			}else{
				$('#levelWidth').val(cl.width);
			}

		}

		e.preventDefault();
	},

	'click #levelHeight':function(e){

		var h = $('#levelHeight').val();
		Session.set("currentLevel", DesignerGameMaps.findOne(Session.get("currentLevel")._id));
		var cl = Session.get("currentLevel");

		if(h > cl.height){


			for(var y = cl.height; y < h; y++){

				for(var x = 0; x < cl.width; x++){

					var cell = createMapCell(cl, x, y);

					DesignerGameMaps.insert(cell);
					
				}
			}

			DesignerGameMaps.update(cl._id, {$set:{height: parseInt(h)}});

			isReduceWarning = false;

		}else{

			if(!isReduceWarning){
				isReduceWarning = confirm("Data may be lost. Do you wish to continue ?");
			}

			if(isReduceWarning){

				DesignerGameMaps.find({levelId: cl.levelId, y: {$gte: parseInt(h)}}).forEach(function(cell){

					DesignerGameMaps.remove(cell._id);

				});

				DesignerGameMaps.update(cl._id, {$set:{height: parseInt(h)}});

			}else{
				$('#levelHeight').val(cl.height);
			}

		}

		e.preventDefault();
	},


	'blur #levelName':function(e){

		var name = $('#levelName').val();

		
		if(!DesignerGameMaps.findOne({type: "levelHeader", level: name, creator: Meteor.user()._id })){

			DesignerGameMaps.find({levelId: Session.get("currentLevel")._id}).forEach(function(item){
				DesignerGameMaps.update( item._id ,{$set: {level: name}});
			});

			updateCurrentLevel();
		
		}else{

			$('#levelName').val(Session.get("currentLevel").level);
			alert("A level of this name already exists. Enter a new one.");
		}

		

		e.preventDefault();
	}

});

Template.mainSettings.currentLevel = function(){return DesignerGameMaps.findOne(Session.get("currentLevel")._id)}

/*------------------------------------------------------add Features --------------------------------------------*/


Template.addFeatures.events({

	'click .featureOption':function(e){

		isReduceWarning = false;
		Session.set("currentFeatureType", e.currentTarget.id);
		ce = DesignerGameDefs.findOne({type: Session.get("currentFeatureType"), creator: Meteor.user()._id});
		Session.set("currentElement", ce);
		e.preventDefault();
	}

});




/*-------------------------------------------------------entry Selector ----------------------------------------*/

Template.entrySelector.created = function(){
	Session.set("currentElement", 0);
}

Template.entrySelector.currentEntryPoint = function(){return Session.get("currentElement");}
Template.entrySelector.entryPoints = function(){return [0,1,2,3,4,5,6,7,8,9]}
Template.entrySelector.events({

	'click .entryOption':function(e){

		isReduceWarning = false;
		var idx = e.currentTarget.id.split("_");
		Session.set("currentElement", parseInt(idx[1]));
		e.preventDefault();
	}

});


/*----------------------------------------------------standard selector-------------------------------------------------------*/

Template.selector.created = function(){

	Meteor.defer(function(){
		ce = DesignerGameDefs.findOne({type: Session.get("currentFeatureType"), creator: Meteor.user()._id});
		Session.set("currentElement", ce);
	});

}


Template.selector.events({

	'click .elemOption':function(e){

		isReduceWarning = false;
		ce = DesignerGameDefs.findOne(e.currentTarget.id);
		Session.set("currentElement", ce);
		e.preventDefault();
	},

	'click #removeBox':function(e){
		isRemoveItems = $('#removeBox').is(':checked');
	}

});



/*-------------------------------HELPER FUNCTIONS------------------------------------*/

function makeLevelCopy(o_levelName, o_creator, n_levelName, n_creator){


	if(DesignerGameMaps.findOne({type: 'levelHeader', level: n_levelName, creator: n_creator})){
		n_levelName = n_levelName + "_" + generateTempId(5);
	}

	var clh = DesignerGameMaps.findOne(Session.get("currentLevel")._id);
	var nlh = DesignerGameMaps.findOne(Session.get("currentLevel")._id);
	var mapTypes = [];

	//add the new depenencies and convert the mapKey

	for(var i = 0; i < nlh.mapKey.length; i ++){

		var o_t = DesignerGameDefs.findOne(clh.mapKey[i]);
		var n_t = DesignerGameDefs.findOne({type: o_t.type, name: o_t.name, creator: n_creator});

		mapTypes.push(o_t.type);

		if(!n_t){
			delete o_t["_id"];
			o_t.creator = n_creator;
			nlh.mapKey[i] = DesignerGameDefs.insert(o_t);
		}else{
			nlh.mapKey[i] = n_t._id;
		}

	}

	nlh.creator = n_creator;
	nlh.level = n_levelName;
	delete nlh["_id"];
	nlh._id = DesignerGameMaps.insert(nlh); 


	DesignerGameMaps.find({type: 'cell', levelId: clh._id}).forEach(function(elem){

		elem.level = n_levelName;
		elem.creator = n_creator;
		elem.levelId = nlh._id;
		delete elem["_id"];

		for(var i = 0; i < nlh.mapKey.length; i++){

			if(elem[mapTypes[i]] == clh.mapKey[i]){
				elem[mapTypes[i]] = nlh.mapKey[i];

			}

		}

		DesignerGameMaps.insert(elem);
			

	});

	var inv = DesignerGameMaps.findOne({type: 'inventory', levelId: nlh._id});

	inv.creator = n_creator;
	inv.level = n_levelName;
	inv.levelId = nlh._id;
	delete inv["_id"];

	DesignerGameMaps.insert(inv);

	return nlh._id;

}



function updateKey(){


	var elements = []; 
	var elemTypes = ["terrain", "exitPoint", "wall", "pickupable"];

	for(var i = 0; i < elemTypes.length; i++){

		DesignerGameDefs.find({creator: Session.get('currentLevel').creator, type: elemTypes[i]}).forEach(function(e){

			var searchObj = {type: 'cell', level: Session.get("currentLevel").level, creator: Session.get('currentLevel').creator};
			searchObj[elemTypes[i]] = e._id;

			if(DesignerGameMaps.findOne(searchObj))elements.push(e._id);

		}); 

	}

	DesignerGameMaps.update(Session.get("currentLevel")._id, {$set:{mapKey: elements}});

}

function updateLevelInventory(){

	var inv = DesignerGameMaps.findOne({type: 'inventory', levelId: Session.get("currentLevel")._id});
	var pickupables = {};
	var id = Session.get("currentLevel")._id;

	DesignerGameMaps.find({type: 'cell', levelId: id, pickupable: {$not: 'none'}}).forEach(function(e){

		if(typeof pickupables[e.x] === 'undefined')pickupables[e.x] = {};
		var p = getElement(e.pickupable);
		p.state = "dropped";
		pickupables[e.x][e.y] = [p];

	});

	DesignerGameMaps.update(inv._id, {$set: {pickupables: pickupables}});

}



Template.mapKey.elemTerrain = function(){return this.type == 'terrain';}
Template.mapKey.elemExitPoint = function(){return this.type == 'exitPoint';}
Template.mapKey.elemWall = function(){return this.type == 'wall';}
Template.mapKey.elemPickupable = function(){return this.type == 'pickupable';}








