var GraphicInterface = function(conf) {

    this.conf = conf;
    this.oldTime = 0;
    this.runAnimation = true;
    this.globalTime = 0;
    this.distance = 0;
    this.cameraAngle = 0;
    this.cameraPosition = 0;
    this.cameraTarget = new THREE.Vector3(0,10000,0);
    this.uniformsArr = [];
    this.cubeUniformsArr = [];
    this.arrowUniformsArr = [];
    this.onRenderFunctions = [];
    this.flashEffect = false;
    this.shakeAnimation = false;

    var container = document.createElement( 'div' );
    document.body.appendChild( container );

    try {
        this.renderer = new THREE.WebGLRenderer({antialias: true});
        this.renderer.setSize( window.innerWidth, window.innerHeight );
        container.appendChild( this.renderer.domElement );
    }
    catch (e) {
        console.log('No WebGL!');
        return;
    }
    SHADER_LOADER.load(function(data) {

        this.fragmentShader = data.commonShader.fragment;
        this.vertexShader = data.commonShader.vertex;

        this.setupStats();
        this.init();
        this.animate();

    }.bind(this));
};

GraphicInterface.prototype = {
    init: function(){
        var conf = this.conf;
        this.scene = new THREE.Scene();
        this.camera = this.createCamera();
        this.scene.add(this.camera);

        var path = new THREE.SplineCurve3([
           new THREE.Vector3(0, 0, 0),
           new THREE.Vector3(10, 100, 10),
           new THREE.Vector3(100, 200, 100),
           new THREE.Vector3(300, 300, 300),
           new THREE.Vector3(100, 580, 100),
           new THREE.Vector3(100, 1580, 100)
        ]);
        this.path = path;
        this.p = new Path(path, 40);
        for(var i = 0; i < 26; i++) {
            this.scene.add(this.createTubeSegment(path, i));
        }

        THREEx.WindowResize(this.renderer, this.camera);
    },
    createCamera: function() {
        var camera = new THREE.PerspectiveCamera( 65, window.innerWidth / window.innerHeight, 1, 10000 );
        return camera;
    },
    createTube: function(spline) {
        var length = this.conf.tubeLength * this.conf.textureLength;
        var path = new THREE.Curves.Custom();
        //var geometry = new THREE.PlaneGeometry(1, 1, 1, 1);
        var geometry = new THREE.TubeTileGeometry(spline, 20, 30, 12, 0, 0, false);
        //var geometry = new THREE.CylinderGeometry(
            //this.conf.radius,
            //this.conf.radius,
            //length,
            //this.conf.numOfSegments,
            //this.conf.tubeLength * 10,
            //true);
        geometry.applyMatrix( new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(-Math.PI/2,0,0)));
        geometry.applyMatrix( new THREE.Matrix4().setPosition( new THREE.Vector3( 0, 0, -50) ) );

        var map = THREE.ImageUtils.loadTexture( "textures/sq.jpg" );

        map.wrapS = map.wrapT = THREE.RepeatWrapping;
        var maxAnisotropy = this.renderer.getMaxAnisotropy();
        map.anisotropy = maxAnisotropy;

        var attributes = {};

        var uniforms = {
            color:      { type: "c", value: new THREE.Color( 0xffffff ) },
            texture:    { type: "t", value: map },
            globalTime: { type: "f", value: 0.0 },
            speed:      { type: "f", value: this.conf.speed },
            dynamic:    { type: "f", value: false },
            highlight:  { type: "f", value: 1.0 },
            //uvScale:    { type: "v2", value: new THREE.Vector2( this.conf.numOfSegments, this.conf.tubeLength) }
            uvScale:    { type: "v2", value: new THREE.Vector2(1, 1) }
        };
        this.tubeUniform = uniforms;
        this.uniformsArr.push(uniforms);

        //var material = new THREE.ShaderMaterial( {
            //uniforms:       uniforms,
            //attributes:     attributes,
            //vertexShader:   this.vertexShader,
            //fragmentShader: this.fragmentShader,
            //side:           THREE.BackSide
        /*});*/
        var material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            wireframe: true,
            side: THREE.BackSide
        });

        mesh = new THREE.Mesh( geometry, material );
        return mesh;
    },
    createTubeSegment: function(path, num) {

        var geometry = new THREE.TubePieceGeometry(path, 40 * num, 40, 10, 20, 12);

        var map = THREE.ImageUtils.loadTexture( "textures/sq2.jpg" );
        map.wrapS = map.wrapT = THREE.RepeatWrapping;
        map.repeat.set( 3, 12 );

        var material = new THREE.MeshBasicMaterial({
            map: map,
            side: THREE.BackSide
            //wireframe: true
        });

        var mesh = new THREE.Mesh( geometry, material );
        return mesh;
    },
    createObstacle: function(pos, color, distance, type) {
        type = type || 'cube';
        group = new THREE.Object3D();
        var types = {
            cube: function() {
                group.add(this.createCube(pos, color, distance + this.conf.pathLength));
                group.add(this.createPath(pos, color, distance));
                return group;
            },
            pillar: function() {
                group.add(this.createPillar(pos, color, distance + this.conf.pathLength));
                group.add(this.createPath(pos, color, distance));
                group.add(this.createPath(pos + 6, color, distance));
                return group;
            }
        };
        return types[type].bind(this)();
    },
    createCube: function(pos, color, distance) {
        var width = getSegmentWidth(this.conf.numOfSegments, this.conf.radius);
        var distanceToCenter = getDistanceToSegment(this.conf.numOfSegments, this.conf.radius) - 0.01;

        var geometry = new THREE.CubeGeometry(width, width, this.conf.textureLength);
        geometry.applyMatrix( new THREE.Matrix4().setPosition( new THREE.Vector3( 0, distanceToCenter - width/2, -this.conf.textureLength*3/2)));//prevent clipping
        geometry.applyMatrix( new THREE.Matrix4().makeRotationZ(-Math.PI/12 - Math.PI/6*pos));
        var map = THREE.ImageUtils.loadTexture( "textures/mask.png" );

        map.wrapS = map.wrapT = THREE.RepeatWrapping;
        var maxAnisotropy = this.renderer.getMaxAnisotropy();
        map.anisotropy = maxAnisotropy;

        var attributes = {};

        var uniforms = {
            color:      { type: "c", value: new THREE.Color(color) },
            texture:    { type: "t", value: map },
            globalTime: { type: "f", value: 0.0 },
            position:   { type: "f", value: pos },
            dynamic:    { type: "f", value: true },
            highlight:  { type: "f", value: 1.0 },
            distance:   { type: "f", value: (distance - 1) * this.conf.textureLength},
            speed:      { type: "f", value: this.conf.speed * this.conf.textureLength },
            uvScale:    { type: "v2", value: new THREE.Vector2( 1.0, 1.0) }
        };

        var material = new THREE.ShaderMaterial( {
            uniforms:       uniforms,
            attributes:     attributes,
            vertexShader:   this.vertexShader,
            fragmentShader: this.fragmentShader
        });
        this.uniformsArr.push(uniforms);
        this.cubeUniformsArr.push(uniforms);
        return new THREE.Mesh( geometry, material );
    },
    createPillar: function(pos, color, distance) {
        var width = getSegmentWidth(this.conf.numOfSegments, this.conf.radius);
        var distanceToCenter = getDistanceToSegment(this.conf.numOfSegments, this.conf.radius) - 0.01;
        var height = distanceToCenter * 2;

        var geometry = new THREE.CubeGeometry(width, height, this.conf.textureLength);
        geometry.applyMatrix( new THREE.Matrix4().setPosition( new THREE.Vector3( 0, 0, -this.conf.textureLength*3/2)));//prevent clipping
        geometry.applyMatrix( new THREE.Matrix4().makeRotationZ(-Math.PI/12 - Math.PI/6*pos));
        var map = THREE.ImageUtils.loadTexture( "textures/mask.png" );

        map.wrapS = map.wrapT = THREE.RepeatWrapping;
        var maxAnisotropy = this.renderer.getMaxAnisotropy();
        map.anisotropy = maxAnisotropy;

        var attributes = {};

        var uniforms = {
            color:      { type: "c", value: new THREE.Color(color) },
            texture:    { type: "t", value: map },
            globalTime: { type: "f", value: 0.0 },
            position:   { type: "f", value: pos },
            dynamic:    { type: "f", value: true },
            highlight:  { type: "f", value: 1.0 },
            distance:   { type: "f", value: (distance - 1) * this.conf.textureLength},
            speed:      { type: "f", value: this.conf.speed * this.conf.textureLength },
            uvScale:    { type: "v2", value: new THREE.Vector2( 1.0, 1.0) }
        };

        var material = new THREE.ShaderMaterial( {
            uniforms:       uniforms,
            attributes:     attributes,
            vertexShader:   this.vertexShader,
            fragmentShader: this.fragmentShader
        });
        this.uniformsArr.push(uniforms);
        this.cubeUniformsArr.push(uniforms);
        return new THREE.Mesh( geometry, material );
    },
    createPath: function(pos, color, distance) {

        var length = this.conf.pathLength * this.conf.textureLength;
        var width = getSegmentWidth(this.conf.numOfSegments, this.conf.radius);
        var distanceToCenter = getDistanceToSegment(this.conf.numOfSegments, this.conf.radius) - 0.02;

        var geometry = new THREE.PlaneGeometry(width, length, 1, this.conf.pathLength * 10);
        geometry.applyMatrix( new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(Math.PI/2,0,0)));
        geometry.applyMatrix( new THREE.Matrix4().setPosition( new THREE.Vector3( 0, distanceToCenter, -length/2)));
        geometry.applyMatrix( new THREE.Matrix4().makeRotationZ(-Math.PI/12 - Math.PI/6*pos));
        var map = THREE.ImageUtils.loadTexture( "textures/mask.png" );

        map.wrapS = map.wrapT = THREE.RepeatWrapping;
        var maxAnisotropy = this.renderer.getMaxAnisotropy();
        map.anisotropy = maxAnisotropy;

        var attributes = {};

        var uniforms = {
            color:      { type: "c", value: new THREE.Color(color) },
            texture:    { type: "t", value: map },
            globalTime: { type: "f", value: 0.0 },
            position:   { type: "f", value: pos },
            dynamic:    { type: "f", value: true },
            highlight:  { type: "f", value: 1.0 },
            distance:   { type: "f", value: distance * this.conf.textureLength},
            speed:      { type: "f", value: this.conf.speed * this.conf.textureLength },
            uvScale:    { type: "v2", value: new THREE.Vector2( 1.0, this.conf.pathLength ) }
        };

        var material = new THREE.ShaderMaterial( {
            uniforms:       uniforms,
            attributes:     attributes,
            vertexShader:   this.vertexShader,
            fragmentShader: this.fragmentShader
        });
        this.uniformsArr.push(uniforms);
        return new THREE.Mesh( geometry, material );
    },
    createArrows: function(pos, distance) {

        var length = this.conf.arrowLength * this.conf.textureLength;
        var width = getSegmentWidth(this.conf.numOfSegments, this.conf.radius);
        var distanceToCenter = getDistanceToSegment(this.conf.numOfSegments, this.conf.radius) - 0.01;

        var geometry = new THREE.PlaneGeometry(width, length, 1, this.conf.arrowLength * 10);
        geometry.applyMatrix( new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(Math.PI/2,0,0)));
        geometry.applyMatrix( new THREE.Matrix4().setPosition( new THREE.Vector3( 0, distanceToCenter, -length/2)));
        geometry.applyMatrix( new THREE.Matrix4().makeRotationZ(-Math.PI/12 - Math.PI/6*pos));
        var map = THREE.ImageUtils.loadTexture( "textures/arrow.png" );

        map.wrapS = map.wrapT = THREE.RepeatWrapping;
        var maxAnisotropy = this.renderer.getMaxAnisotropy();
        map.anisotropy = maxAnisotropy;

        var attributes = {};

        var uniforms = {
            color:      { type: "c", value: new THREE.Color(0xffffff) },
            texture:    { type: "t", value: map },
            globalTime: { type: "f", value: 0.0 },
            position:   { type: "f", value: pos },
            dynamic:    { type: "f", value: true },
            highlight:  { type: "f", value: 1.0 },
            distance:   { type: "f", value: distance * this.conf.textureLength},
            speed:      { type: "f", value: this.conf.speed * this.conf.textureLength },
            uvScale:    { type: "v2", value: new THREE.Vector2( 1.0, this.conf.arrowLength ) }
        };

        var material = new THREE.ShaderMaterial( {
            uniforms:       uniforms,
            attributes:     attributes,
            transparent:    true,
            vertexShader:   this.vertexShader,
            fragmentShader: this.fragmentShader
        });
        this.uniformsArr.push(uniforms);
        this.arrowUniformsArr.push(uniforms);

        return new THREE.Mesh( geometry, material );
    },
    removeObstacle: function(obstacle) {
    },
    getSpeed: function() {
        return this.tubeUniform.speed.value;
    },
    setSpeed: function(speed) {
        this.globalTime = this.globalTime * this.tubeUniform.speed.value/speed;
        this.uniformsArr.forEach(function(uniform) {
            uniform.speed.value = speed * this.conf.textureLength;
        }.bind(this));
        this.tubeUniform.speed.value = speed;
    },
    onCollisions: function(callback) {
        var p = this.camerPosition;
        this.cubeUniformsArr.forEach(function(uniform, i) {
            if(uniform.position && uniform.position.value == p) {
                if(uniform.distance &&
                    this.distance - this.conf.textureLength > uniform.distance.value &&
                    this.distance - 2 * this.conf.textureLength < uniform.distance.value ) {
                    if(callback) callback();
                }
            }
        }.bind(this));
    },
    onArrowCollisions: function(callback) {
        var index = -1;
        var p = this.camerPosition;
        this.arrowUniformsArr.forEach(function(uniform, i) {
            if(uniform.position && uniform.position.value == p) {
                if(uniform.distance &&
                    this.distance - this.conf.textureLength > uniform.distance.value &&
                    this.distance - 10 * this.conf.textureLength < uniform.distance.value ) {
                    index = i;
                    if(callback) callback();
                }
            }
        }.bind(this));
        if(index !== -1) {
            this.arrowUniformsArr.splice(index, 1);
        }
    },
    stopAnimation: function() {
        this.runAnimation = false;
    },
    getCameraPosition: function() {
        return this.camerPosition;
    },
    rotateCamera: function(angle) {
        this.cameraAngle += angle;

        var num = this.conf.numOfSegments;
        var position = Math.floor(this.cameraAngle / (360 / num));
        if(position >= num || position < 0) {
            var divisor = Math.floor(position / num);
            position = position - divisor * num;
        }
        this.camerPosition = position;
    },
    runBoostEffect: function() {
    },
    runCrashEffect: function() {
    },
    runFlashEffect: function() {
        this.uniformsArr.forEach(function(uniform) {
            uniform.highlight.value = 12.5;
        });
        this.flashEffect = true;
    },
    shakeCamera: function() {
        this.shakeAnimation = true;
        this.shakeAnimationI = 0;
    },
    computeCameraTargetVector: function() {
        this.shakeAnimationI += 0.1;

        var cameraTarget = this.cameraTarget.clone();
        var radians = angleToRadians(this.cameraAngle);

        cameraTarget.x = Math.sin(radians) * Math.sin(this.shakeAnimationI * 7) * 15 * Math.exp(-this.shakeAnimationI * 0.7);
        cameraTarget.y = Math.cos(radians) * Math.sin(this.shakeAnimationI * 7) * 15 * Math.exp(-this.shakeAnimationI * 0.7);

        return cameraTarget;
    },
    highlightLine: function(position) {
        if(!this.flashEffect) {
            this.uniformsArr.forEach(function(uniform) {
                if(uniform.position && uniform.position.value == position) {
                    uniform.highlight.value = 2.0;
                } else {
                    uniform.highlight.value = 1.0;
                }
            });
        }
    },
    setupStats: function() {
        this.rendererStats = new THREEx.RendererStats();
        $(this.rendererStats.domElement).css({
            position: 'absolute',
            left: '0px',
            bottom: '0px'
        }).appendTo($('body'));

        this.stats = new Stats();
        this.stats.setMode(0); // 0: fps, 1: ms

        $(this.stats.domElement).css({
            position: 'absolute',
            right: '0px',
            bottom: '0px'
        }).appendTo($('body'));
    },
    onRender: function(func) {
        this.onRenderFunctions.push(func);
    },

    animate: function() {
        if(this.runAnimation) {
            requestAnimationFrame(this.animate.bind(this));
            this.render();
        }
    },
    render: function() {

        this.stats.begin();
        this.rendererStats.update(this.renderer);

        this.onRenderFunctions.forEach(function(func) {
            func(this.renderer);
        }.bind(this));

        var time = new Date().getTime();
        var delta = time - this.oldTime;
        this.oldTime = time;

        if (isNaN(delta) || delta > 1000 || delta === 0 ) {
            delta = 1000/60;
        }

        var radians = angleToRadians(this.cameraAngle);

        this.globalTime += delta * 0.0006;
        this.distance = this.globalTime * this.conf.speed * this.conf.textureLength;

        this.uniformsArr.forEach(function(uniform) {
            uniform.globalTime.value = this.globalTime;
            if(this.flashEffect) {
                if(uniform.highlight.value < 1.2) {
                    uniform.highlight.value = 1;
                    this.flashEffect = false;
                } else {
                    uniform.highlight.value -= 0.5;
                }
            }
        }.bind(this));

        this.camera.position.x = 25 * Math.sin(radians);
        this.camera.position.y = 25 * Math.cos(radians);

        if(this.shakeAnimation) {
            var E = 0.01;
            var CT = this.cameraTarget;
            var newCT = this.computeCameraTargetVector();
            if(Math.abs(CT.x - newCT.x) < E && Math.abs(CT.y - newCT.y) < E) {
                this.shakeAnimation = false;
                this.cameraTarget = new THREE.Vector3(0, 0, -70);
            } else {
                this.cameraTarget = newCT;
            }
        }

        var point = this.p.getPointAt(0);
        var point2 = this.p.getPointAt(0.001);
        var pos2 = new THREE.Vector3();

        var normal = this.p.getNormal(0);
        var binormal = this.p.getBinormal(0);

        var cx = -10 * Math.cos(radians); // TODO: Hack: Negating it so it faces outside.
        var cy = 10 * Math.sin(radians);


        pos2.copy( point );
        pos2.x += cx * normal.x + cy * binormal.x;
        pos2.y += cx * normal.y + cy * binormal.y;
        pos2.z += cx * normal.z + cy * binormal.z;


        //point2.x += 10 * Math.sin(radians);
        //point2.z += 10 * Math.cos(radians);

        this.camera.position = pos2;

        //this.camera.position.x += 10 * Math.sin(radians);
        //this.camera.position.z += 10 * Math.cos(radians);

        this.camera.up.x = Math.sin(radians);
        this.camera.up.z = -Math.cos(radians);

        this.camera.lookAt(this.cameraTarget);

        this.renderer.render(this.scene, this.camera);
        this.stats.end();
    }
};

var Path = function(curve, segments) {
    this.curve = curve;
    this.segments = segments;

    this.tangents  = [];
    this.normals   = [];
    this.binormals = [];

    this.calcTangets();
    this.calcNormalsAndBinormals();
};

Path.prototype = {
    getPointAt: function(u) {
        return this.curve.getPointAt(u);
    },
    getTangent: function(index) {
        return this.tangents[index];
    },
    getNormal: function(index) {
        return this.normals[index];
    },
    getBinormal: function(index) {
        return this.binormals[index];
    },
    calcTangets: function() {
        for(var i = 0; i < this.segments; i++) {

            var u = i / (this.segments - 1);

            this.tangents[i] = this.curve.getTangentAt(u);
            this.tangents[i].normalize();

        }
    },
    calcNormalsAndBinormals: function() {

        var theta;
        var epsilon = 0.0001;
        var normal = new THREE.Vector3();
        var vec = new THREE.Vector3();
        var mat = new THREE.Matrix4();

        this.normals[ 0 ] = new THREE.Vector3();
        this.binormals[ 0 ] = new THREE.Vector3();
        var smallest = Number.MAX_VALUE;

        var tx = Math.abs( this.tangents[ 0 ].x );
        var ty = Math.abs( this.tangents[ 0 ].y );
        var tz = Math.abs( this.tangents[ 0 ].z );

        if ( tx <= smallest ) {
            smallest = tx;
            normal.set( 1, 0, 0 );
        }

        if ( ty <= smallest ) {
            smallest = ty;
            normal.set( 0, 1, 0 );
        }

        if ( tz <= smallest ) {
            normal.set( 0, 0, 1 );
        }

        vec.crossVectors( this.tangents[ 0 ], normal ).normalize();

        this.normals[ 0 ].crossVectors( this.tangents[ 0 ], vec );
        this.binormals[ 0 ].crossVectors( this.tangents[ 0 ], this.normals[ 0 ] );

        for (var i = 1; i < this.segments; i++ ) {

            this.normals[i] = this.normals[i - 1].clone();

            this.binormals[i] = this.binormals[i - 1].clone();

            vec.crossVectors(this.tangents[i - 1], this.tangents[i]);

            if(vec.length() > epsilon) {

                vec.normalize();

                theta = Math.acos(THREE.Math.clamp(this.tangents[i - 1].dot(this.tangents[i]), -1, 1)); // clamp for floating pt errors

                this.normals[i].applyMatrix4(mat.makeRotationAxis(vec, theta));

            }

            this.binormals[i].crossVectors(this.tangents[i], this.normals[i]);

        }



    }
};

