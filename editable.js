//require rotatable

(function($)
{
	// use scope of $.fn.editable as self
	var Editable = function(){ this.idNum = 0; }
	var self = $.editables = new Editable();
	
	$.fn.editable = function (option,settings){
		if(typeof option === 'object') {
			settings = option;
		}
		
		var $settings = jQuery.extend(true, self.defaultSettings, settings);
		
		if( typeof option === 'string' ){
			// there is some better expression
			if( option == 'toData' ){
				return self.toData( $(this[0]) , $settings );
			}
			if( option == 'render' ){
				return self.render( $(this[0]) , $settings );
			}
		} 
		
		this.each(function(){	
			console.log("init editable");	
			var $src = $(this);
			
			//prevent double init of editable
			if( $src.hasClass("ui-editable") ) return;
			
			//make id
			var id = self.idNum;
			self.idNum++;
			
			//addClass to el
			var $el = $src.wrap( $("<div></div>") ).parent();
			$el	.addClass( "ui-editable" )
				.adjust( $src )
				.css( $settings.elStyle );
			$el	.data.id = id;
			
			$src.addClass( $settings.className )
				.addClass( $settings.contentClassName )
				.addClass( $settings.contentClassName + id )
				.addClass('background-as-img');
			
			if ( $settings.draggable ) {//TODO: prevent jumping at drag start when item was rotated 
				$el.draggable( $settings.dragSettings);
			}
			
			if ( $settings.contenteditable){	
				self.setEditable( $el, $settings ); 
				//add also resize to resizeSettings
				$settings.resizeSettings = 
					jQuery.extend( true, $settings.resizeSettings, 
						{ alsoResize: "."+$settings.contentClassName+id  }
					);
			}
			
			if ( $settings.resizable ) {
				$el.resizable($settings.resizeSettings);
				$( ".ui-resizable-handle", $el).addClass( $settings.uiIconClass );
			}
			if ( $settings.removable ){
				//self.setRemoveIcon( $el, $settings );
				$el.removable( $settings );
			}
			if ( $settings.rotatable ){
				//self.setRotateIcon( $el, $settings );
				$el.rotatable( $settings )
			}
			if ( $settings.reflectable ){
				self.setReflectIcon( $el, $settings );
			}
			self.initIcon( $el, $settings);
			
			self.setOnSelected( $el, $settings );
		});
		
		return this;
	};
	
	//default settings for editable
	self.defaultSettings = {
		//calss: you can use another class and css for controll icon
		className:			"src-obj",
		textClassName:		"text",
		contentClassName:	"content",
		uiIconClass:		"ui-editable-icon",
		rotateIconClass:	"icon-repeat",
		removeIconClass:	"icon-remove-sign",
		reflectIconClass:	"icon-resize-horizontal",
		
		//data: if this is set, first el is rendered by data
		//you can get data by $.editable("toData") and apply it by $.editable("render")
		data: null,
		
		// enable/diseble options
		removable:		true,
		rotatable:		true,
		resizable:		true,
		draggable:		true,
		reflectable:	true,
		contenteditable:true,
		iconAutoHide:	true,
		escapeText:		true, //disabled: data is directly saved/loaded as html 
		
		//callbacks
		onEditStart:	null,
		onEditEnd:		null,
		onRotateStart:	null,
		onRotateStop:	null,
		onReflect:		null,//called after reflect $el
		onRemove:		null, //called before remove $el
		onRender:		null, // called after default rendering
		
		onToData:		null, // you shold return data, use forrowing format
		//onToData: function( data , $el , $settings ) { return data; },
		
		onSelect: function( $el, $settings){
			if( self.prevSelectedEl ) self.prevSelectedEl.removeClass( 'ui-editable-selected' );
			$el.addClass( 'ui-editable-selected' );
		},
		
		//settings for $.fn.draggable
		dragSettings : {
			//start:onDragStart, //set callback here
			//stop: onDragStop   //set callback here
		},
		
		//settings for $.fn.resizable
		resizeSettings : {
			//start:onResizeStart, //set callback here
			//stop: onResizeStop,  //set callback here
			autoHide: true,
			"handles": "n, e, s, w, ne, se, sw, nw"
			//alsoResize is used when contenteditable option is true
		},
		
		//styles: default css setting
		elStyle: {
			'position': "absolute",
		},
		
	};
	
	self.toData = function( $el , $settings){
		var data = {};
		data.pos = self.getPos($el);
		data.size = { 'width':$el.width() , 'height':$el.height() };
		data.rotation = $el.rotate();
		data.isReflected = $el.data.isReflected;
		if( $settings.escapeText ) {
			data.text = $('.'+$settings.textClassName ,$el).escapeText();
		}else {
			data.text = $('.'+$settings.textClassName ,$el).html();
		}
		data.background = $('.'+$settings.className ,$el)[0].style.backgroundImage;
		if( $settings.onTodata ){ 
			data = $settings.onToData( data, $el, $settings );
		}
		return data;
	};
	
	self.getPos = function( $el ){
		var deg = $el.rotate();
		$el.rotate( 0 ); //get un rotated position
		
		var pos =  { 
			position: $el[0].style.position,
			top : $el.offset().top - $el.parent().offset().top ,
         	left: $el.offset().left - $el.parent().offset().left,
			zIndex : $el[0].style.zIndex
		}
		$el.rotate( deg ); //rotate saved val
		
		return pos;
	};
	
	self.render = function( $el , $settings ){
		var data = $settings.data;
		if( data == null ) return;
		var $src = $("."+$settings.className, $el );
		
		$el	.css( $settings.elStyle )
			.width( data.size.width )
			.height( data.size.height )
			.rotate( data.rotation )
			.css( data.pos );
		$src
			.css( { 'background-image': data.background } );
		
		
		// apply text to exist div or create div
			self.initDiv( $el , $settings , data );
		
		if( $settings.onRender ) $settings.onRender( $el, $settings );
		
		return $el;
	}
	
	self.initDiv = function( $el, $settings , data ){
		if( $el.children().hasClass( $settings.textClassName ) ){
			return;
		}
		if ( !data ) data = {};
		
		var $src = $("."+$settings.className, $el );
		if( $src.length == 0){
			$src = $("<div></div>").appendTo( $el );
			
		}
		
		if( $src[0].tagName == "IMG" ){
			var $src2 =  $("<div></div>").appendTo( $el );
			if( !data.background ){
				data.background =  'url('+$src.attr("src")+')';
			}
			$src.remove();
			$src = $src2;
		}
		
		$src.adjust($el)
			.addClass('background-as-img')
			//.css({ 'background-image': 'url('+$src.attr('src')+')' })
			.addClass( $settings.contentClassName )
			.addClass( $settings.contentClassName+$el.data.id  );
		
		if( data.background ){
			$src.css({ 'background-image':data.background });
		}
			
			
		if( !data.text ) {
			data.text = $src.html();
		}
		
		var $text = $('<div contenteditable="false" ></div>');
		$text.addClass( $settings.textClassName )
			.addClass( $settings.contentClassName+$el.data.id  )
			.appendTo( $src )
			.adjust( $el )
			.html( data.text );
	}

	self.addTextDiv = function( $el , $settings , text){
		//console.log( $settings.textClassName );
		//prevent double add contetnt div
		if( $el.children().hasClass( $settings.textClassName ) ){
			return;
		}
		var $src = $("."+$settings.className, $el );
		if( !text ) text = $src.html();
		$src.text("");
		var $text = $('<div contenteditable="false" ></div>');
		$text.addClass( $settings.contentClassName )
			.addClass( $settings.textClassName )
			.appendTo( $src )
			.adjust( $el )
			.html(text);
	};
	
	// add contenteditable enabled on click
	self.setEditable = function( $el , $settings ){
		//self.addTextDiv( $el , $settings );
		self.initDiv( $el , $settings );
		
		
		$el.click( function(ev){
			console.log( "edit");
			if( self.iconPushed ) {
				self.iconPushed = false;
				return;
			}
			if( !$el.data.isEditing ){
				$('.'+$settings.textClassName,$el).attr('contenteditable','true').focus();
				$el.data.isEditing = true;
				if( $settings.iconAutoHide ) {
					$('.'+$settings.uiIconClass, $el).hide();         //hide icons
					$('.ui-resizable-handle', $el).hide(); //hide resize handle
				}
				$el	.draggable("option","disabled",true) // disable draggable
					.removeClass('ui-state-disabled');   // remove disabled style
				if( $settings.onEditStart ) $settings.onEditStart( $el, $settings ) ;
			}
		});
		
		$('.'+$settings.textClassName, $el).blur( function(){
			$el.draggable("option","disabled",false);
			$('.'+$settings.textClassName, $el).attr('contenteditable','false');
			$el.data.isEditing = false;
			console.log($el.data.isEditing);
			if( $settings.onEditStop ) $settings.onEditStop( $el, $settings ) ;
		});
	}
	
	self.setReflectIcon = function( $el , $settings ){
		$('<i class="icon_reflect" title="reflect" />')
			.addClass( $settings.uiIconClass )
			.addClass( $settings.reflectIconClass )
			.appendTo( $el )
			.click( function(){
				$("."+$settings.contentClassName,$el).reflect();
				if( $settings.onReflect ) $settings.onReflect( $el, $settings ) ;
			});
	};
	
	
	self.setOnSelected= function( $el, $settings ) {
		$el.mousedown( function(){
			self.prevSelectedEl = self.selectedEl;
			self.selectedEl = $el;
			if( $settings.onSelect ) $settings.onSelect( $el, $settings ) ;
		});
	};
	
	//hide and show icon
	self.initIcon = function( $el, $settings ) {
		if( $settings.iconAutoHide ) {
			$('.'+$settings.uiIconClass, $el).hide();
			$el	.mouseover(function(){
					$('.'+$settings.uiIconClass, $el).show(); 
				})
				.mouseout(function(){
					$('.'+$settings.uiIconClass, $el).hide();
				});
		}
		if( !self.iconHandler ){
			$(document).on('mousedown','.'+$settings.uiIconClass , function(){
				console.log("icon pushed");
				self.iconPushed = true;
			});
			//$("body").click( function(){
			//	self.iconPushed = false;
			//});
			self.iconHandler = true;
		}
	};
	
	

	$.fn.adjust = function( $target ){
		this.each(function()
		{	
			var $el = $(this);
			$el.width( $target.width() ).height( $target.height() );
		});
		
		return this;
	}

	$.fn.removable = function (option,settings){
		if(typeof option === 'object') {
			settings = option;
		}
		this.each(function()
		{	
			var $el = $(this);
			var $settings = jQuery.extend(true, self.defaultSettings, settings);
		
			$('<i class="icon_remove" title="remove" />')
				.addClass( $settings.uiIconClass )
				.addClass( $settings.removeIconClass )
				.appendTo( $el )
				.click( function(){
					if( $settings.onRemove ) $settings.onRemove($el) ;
					$el.remove();
				});
		});
		
		return this;
	};
	
	
	// add reflected class to object
	$.fn.reflect = function() {
		return this.each(function()
		{			
			var $el = $(this);
			$el.toggleClass("reflect");
			$el.data.reflected = true;
			return $el;
		});
	};
	
	$.fn.escapeText = function() {
		var $el = $(this[0]);
		var html = $el.html()
			.split('<div><br></div>').join('\n')
			.split('<br>').join('\n')
			.split('<div>').join('\n');
		$el.html( html );
		var text = $el.text().split('\n').join('<br>');
		$el.html( text );
		return text;
	}
	
	// rotate object
	$.fn.rotate = function( deg ) {
		if( !deg && deg != 0 ) {
			//get rotation only set by this
			deg = $(this[0]).data.rotateDeg;
			if ( deg ){
				return deg;
			} else {
				return 0;
			}
		}
		
		this.each(function()
		{			
			var $el = $(this);	
			var rotation = 'rotate('+ deg +'deg)';
			$el
				.css( 'webkitTransform' , rotation )
				.css( 'mozTransform' , rotation )
				.css( 'msTransform' , rotation )
				.css( 'oTransform' , rotation )
				.css( 'transform' , rotation );
			$el.data.rotateDeg = deg;
		});
		
		return this;
	};
	
	$.fn.rotatable = function (option,settings){
		if(typeof option === 'object') {
			settings = option;
		}
		this.each(function()
		{	
			var $el = $(this);
			var $settings = jQuery.extend(true, self.defaultSettings, settings);
			
			//prevent double init of editable
			if( $el.hasClass("ui-rotatable") ) return;			
			//addClass to el
			$el.addClass( "ui-rotatable" );
			
			$('<i class="icon_rotate" title="rotate" />')
				.addClass( $settings.uiIconClass )
				.addClass( $settings.rotateIconClass )
				.appendTo( $el )
				.mousedown( function(ev){
					//console.log("rotate start");
					if( $el.hasClass("ui-draggable") ){
						$el	.draggable("option","disabled",true)
							.removeClass('ui-state-disabled');
					}
					self.rotateStartX = ev.clientX;
					self.rotateStartY = ev.clientY;
					self.isRotating = true;
					//store el and settings to local name space //is there better expression?
					self.target = $el;
					self.targetSettings = $settings;
					if( !$el.data.rotateDeg ) {
						// set rotate offset to ajast icon pos and rotate state
						$el.data.rotateOffset =  Math.atan2(  - 0.5*$el.height() ,  - 0.5*$el.width() ) ;
						$el.data.rotateDeg = 0;
					}
					self.rotateDeg = $el.data.rotateDeg;
					if( $settings.onRotateStart ) $settings.onRotateStart( $el, $settings ) ;
				});
		
			self.setRotateHandler( $settings );
		});
		
		return this;
	};
	
	//set observer to window for mouse event at rotating object
	self.setRotateHandler = function( ){
		if( self.rotateHandler ) return; // this function is set to body at once
		$("body")
			.mousemove( function( ev ){
				if( !self.isRotating ) return;

				//console.log("rotating");
				var $el = self.target;
				var dx = ev.clientX - self.rotateStartX;
				var dy = ev.clientY - self.rotateStartY;
				var k = Math.atan2( dy -0.5*$el.height() , dx -0.5*$el.width()  );
				var rotateDeg = ( k -  $el.data.rotateOffset) * 180 / Math.PI;
				
				//var mx = -0.5*$el.width() * Math.cos(self.rotateDeg) - -0.5*$el.height() * Math.sin(self.rotateDeg);
				//var my = -0.5*$el.width() * Math.sin(self.rotateDeg) + -0.5*$el.height() * Math.cos(self.rotateDeg);
				//var km =  Math.atan2( self.rotateStartY - my , self.rotateStartX - mx ) ;
				//var kd =  Math.atan2( ev.clientY - my , ev.clientX - mx ) ;
				//console.log(  $el.data.rotateOffset );
				//console.log( [ km , mx , my ]);
				//console.log(  kd );
				//var rotateDeg = ( km + kd - $el.data.rotateOffset) * 180 / Math.PI;
				//self.rotateDeg = ( k ) * 180 / Math.PI;
				
				$el.rotate( rotateDeg );
			})
			.mouseup( function( ev ) {
				if( !self.isRotating ) return;
				
				var $el = self.target;
				var $settings = self.targetSettings ;
				if( $el){
					if( $el.hasClass("ui-draggable") ){
						$el.draggable("option","disabled",false); // enable draggable
					}
					if( $settings.onRotateStop )	$settings.onRotateStop( $el, $settings ) ;
				}
				self.isRotating = false;
			});
		
		 self.rotateHandler = true;
	}
}(jQuery));