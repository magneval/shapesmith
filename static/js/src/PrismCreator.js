var SS = SS || {};

SS.PrismCreator = SS.ParentCreator.extend({
    
    initialize: function(attributes) { 
        attributes.noOriginCorner = true;
        SS.ParentCreator.prototype.initialize.call(this, attributes);
        
        if (this.originalNode) {
            this.boundingBox = SS.boundingBoxForGeomNode(this.editingNode);
            this.center = SS.centerOfGeom(this.boundingBox);
        } else {
            this.node.parameters.u = 0;
            this.node.parameters.v = 0;
            this.node.parameters.w = 10;

            this.views.push(new SS.PrismGeomNodeView({model: this}));
            this.trigger('change:model', this);
        }

        this.views = this.views.concat([
            new SS.PrismUVCorner({model: this}),
            new SS.PrismHeightCursoid({model: this}),
            new SS.PrismDimensionArrow({model: this}),
            new SS.PrismDimensionText({model: this})
        ]);
        this.trigger('change', this);
    },

    
    
    mouseDownOnUV: function(corner) {
    },

    getBoundingBox: function() {
        return this.boundingBox;
    },
    
});

SS.PrismGeomNodeView = SS.SceneObjectView.extend({

    initialize: function() {
        SS.SceneObjectView.prototype.initialize.call(this);
        this.model.on('change:model', this.render, this);
        this.bottomMeshes = SS.createGeometry(this.model.childNode);
        this.changeToPreviewColor(this.bottomMeshes);
        this.render();
    },

    remove: function() {
        SS.SceneObjectView.prototype.remove.call(this);
        this.model.off('change:model', this.render);
    },

    render: function() {
        this.clear();
        this.sceneObject.add(this.bottomMeshes['faces']);
        this.sceneObject.add(this.bottomMeshes['edges']);

        var translation = new THREE.Vector3(this.model.node.parameters.u,
                                            this.model.node.parameters.v,
                                            this.model.node.parameters.w);
        var topMeshes = SS.createGeometry(this.model.childNode);
        ['faces', 'edges'].map(function(topology) {
            var meshes = topMeshes[topology];
            for (var i = 0; i < meshes.children.length; ++i) {
                var geometry = meshes.children[i].geometry;
                geometry.vertices = geometry.vertices.map(function(vertex) {
	            var position = vertex.position.clone();
	            position.x = position.x + translation.x;
	            position.y = position.y + translation.y;
	            position.z = position.z + translation.z;
	            return new THREE.Vertex(position);
                });
	    }
        });

        this.changeToPreviewColor(topMeshes);

        this.model.boundingBox = SS.boundingBoxForSceneObject(this.sceneObject);
        this.model.center = SS.centerOfGeom(this.model.boundingBox);
        
        this.sceneObject.add(topMeshes['faces']);
        this.sceneObject.add(topMeshes['edges']);

        var origin = this.model.node.origin;
        this.sceneObject.position = new THREE.Vector3(origin.x, origin.y, origin.z);

        this.postRender();
    },
    
    changeToPreviewColor: function(meshes) {
        meshes.faces.children.map(function(child) {
            child.material = SS.materials.faceMaterial;
        });
        meshes.edges.children.map(function(child) {
            child.material = SS.materials.lineMaterial;

        });
    },

});

SS.PrismUVCorner = SS.DraggableCorner.extend({

    initialize: function(options) {
        SS.DraggableCorner.prototype.initialize.call(this, options);
        this.render();
    },

    priority: 1,

    mouseDown: function() {
        this.model.mouseDownOnUV(this);
    },

    cornerPositionFromModel: function() {
        return {x: this.model.node.origin.x + this.model.node.parameters.u,
                y: this.model.node.origin.y + this.model.node.parameters.v,
                z: this.model.node.origin.z};
    },

    updateModelFromCorner: function(position) {
        var u = position.x - this.model.node.origin.x;
        var v = position.y - this.model.node.origin.y;

        this.model.node.parameters.u = Math.round(u);
        this.model.node.parameters.v = Math.round(v);
    },

});

SS.PrismHeightCursoid = SS.HeightCursoid.extend({

     initialize: function(options) {
	 SS.HeightCursoid.prototype.initialize.call(this);
         this.render();
    },

    cornerPositionFromModel: function() {
        var parameters = this.model.node.parameters
        return {x: this.model.node.origin.x + this.model.node.parameters.u,
                y: this.model.node.origin.y + this.model.node.parameters.v,
                z: this.model.node.parameters.w};
    },    

    updateModelFromCorner: function(position) {
        var parameters = this.model.node.parameters
        var center = this.model.center;
        parameters.w = position.z;
    },

});

SS.PrismDimensionArrow = SS.SceneObjectView.extend({

    render: function() {
        this.clear();

        var origin = this.model.node.origin;
        var u = this.model.node.parameters.u;
        var v = this.model.node.parameters.v;
        var w = this.model.node.parameters.w;

        var dim = SS.createDimArrow(u, new THREE.Vector3(u,v,w));
        this.sceneObject.add(dim);

        this.sceneObject.position = new THREE.Vector3(this.model.node.origin.x, 
                                                      this.model.node.origin.y,
                                                      0);

        this.postRender();
    },

});

SS.PrismDimensionText = SS.DimensionText.extend({

    render: function() {
        this.clear();

        var origin = this.model.node.origin;
        var u = this.model.node.parameters.u;
        var v = this.model.node.parameters.v;
        var w = this.model.node.parameters.w;

        var that = this;
        this.$uvw = this.addElement('<div class="dimension">(' + u + ',' + v + ',' + w + ')</div>');

        this.update();
    },

    update: function() {
        var origin = this.model.node.origin;
        var u = this.model.node.parameters.u;
        var v = this.model.node.parameters.v;
        var w = this.model.node.parameters.w;
      
        this.moveToScreenCoordinates(this.$uvw, 
                                     new THREE.Vector3(this.model.node.origin.x + u/2,
                                                       this.model.node.origin.y + v/2,
                                                       this.model.node.origin.z + w/2));
    },

});

