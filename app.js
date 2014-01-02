//helper functions
function getSegmentWidth(numOfSegments, radius) {
    var angle = angleToRadians(360 / numOfSegments);
    return 2 * radius * Math.sin(angle/2);
}

function angleToRadians(angle) {
    return angle * Math.PI / 180;
}

function getDistanceToSegment(numOfSegments, radius) {
    var angle = angleToRadians(360 / numOfSegments);
    return radius * Math.cos(angle/2);
}

conf = {
    colors: [0xcb3131, 0x338eda, 0xd03ddd],
    radius: 30,
    tubeLength: 60,
    numOfSegments: 12,
    textureLength: 18,
    speed: 5,
    pathLength: 20,
    arrowLength: 8
};

G = function(conf) {

    this.conf = conf;
    this.oldTime = 0;
    this.globalTime = 0;
    this.cameraAngle = 0;
    this.cameraPosition = 0;
    this.uniformsArr = [];
    this.onRenderFunctions = [];

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
    this.init();
    this.animate();
};

G.prototype = {
    init: function(){
        this.scene = new THREE.Scene();
        this.camera = this.createCamera();
        this.scene.add(this.camera);
        this.scene.add(this.createTube());
        this.scene.add(this.createObstacle(1, conf.colors[0], 7));
        this.scene.add(this.createObstacle(3, conf.colors[1], 7));
        this.scene.add(this.createObstacle(10, conf.colors[0], 20));
        this.scene.add(this.createObstacle(8, conf.colors[2], 16));
        this.scene.add(this.createArrows(0, 8));
        this.scene.add(this.createObstacle(2, conf.colors[2], 12));
        this.scene.add(this.createObstacle(7, conf.colors[1], 24));

        THREEx.WindowResize(this.renderer, this.camera);
    },
    createCamera: function() {
        var cameraTarget = new THREE.Vector3(0,0,-70);
        var camera = new THREE.PerspectiveCamera( 65, window.innerWidth / window.innerHeight, 1, 10000 );
        camera.lookAt( cameraTarget );
        return camera;
    },
    createTube: function() {
        var length = this.conf.tubeLength * this.conf.textureLength;
        var geometry = new THREE.CylinderGeometry(
            this.conf.radius,
            this.conf.radius,
            length,
            this.conf.numOfSegments,
            this.conf.tubeLength * 10,
            true);
        geometry.applyMatrix( new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(-Math.PI/2,0,0)));
        geometry.applyMatrix( new THREE.Matrix4().setPosition( new THREE.Vector3( 0, 0, -length/2 ) ) );

        var map = THREE.ImageUtils.loadTexture( "textures/sq2.jpg" );

        map.wrapS = map.wrapT = THREE.RepeatWrapping;
        var maxAnisotropy = this.renderer.getMaxAnisotropy();
        map.anisotropy = maxAnisotropy;

        var attributes = {};

        var uniforms = {
            color:      { type: "c", value: new THREE.Color( 0xffffff ) },
            texture:    { type: "t", value: map },
            globalTime: { type: "f", value: 0.0 },
            speed:      { type: "f", value: this.conf.speed },
            highlight:  { type: "f", value: 1.0 },
            uvScale:    { type: "v2", value: new THREE.Vector2( this.conf.numOfSegments, this.conf.tubeLength) }
        };
        this.uniformsArr.push(uniforms);

        var material = new THREE.ShaderMaterial( {
            uniforms:       uniforms,
            attributes:     attributes,
            vertexShader:   document.getElementById( 'vertexshader' ).textContent,
            fragmentShader: document.getElementById( 'fragmentshader' ).textContent,
            side:           THREE.BackSide
        });

        mesh = new THREE.Mesh( geometry, material );
        return mesh;
    },
    createObstacle: function(pos, color, distance) {
        group = new THREE.Object3D();
        group.add(this.createCube(pos, color, distance + this.conf.pathLength));
        group.add(this.createPath(pos, color, distance));
        return group;
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
            highlight:  { type: "f", value: 1.0 },
            distance:   { type: "f", value: (distance - 1) * this.conf.textureLength},
            speed:      { type: "f", value: this.conf.speed * this.conf.textureLength },
            uvScale:    { type: "v2", value: new THREE.Vector2( 1.0, 1.0) }
        };

        var material = new THREE.ShaderMaterial( {
            uniforms:       uniforms,
            attributes:     attributes,
            vertexShader:   document.getElementById( 'cube.vsh' ).textContent,
            fragmentShader: document.getElementById( 'fragmentshader' ).textContent
        });
        this.uniformsArr.push(uniforms);
        return new THREE.Mesh( geometry, material );
    },
    createPath: function(pos, color, distance) {

        var length = this.conf.pathLength * this.conf.textureLength;
        var width = getSegmentWidth(this.conf.numOfSegments, this.conf.radius);
        var distanceToCenter = getDistanceToSegment(this.conf.numOfSegments, this.conf.radius) - 0.01;

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
            highlight:  { type: "f", value: 1.0 },
            distance:   { type: "f", value: distance * this.conf.textureLength},
            speed:      { type: "f", value: this.conf.speed * this.conf.textureLength },
            uvScale:    { type: "v2", value: new THREE.Vector2( 1.0, this.conf.pathLength ) }
        };

        var material = new THREE.ShaderMaterial( {
            uniforms:       uniforms,
            attributes:     attributes,
            vertexShader:   document.getElementById( 'cube.vsh' ).textContent,
            fragmentShader: document.getElementById( 'fragmentshader' ).textContent
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
        geometry.applyMatrix( new THREE.Matrix4().makeRotationZ(Math.PI/12 + Math.PI/6*pos));
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
            highlight:  { type: "f", value: 1.0 },
            distance:   { type: "f", value: distance * this.conf.textureLength},
            speed:      { type: "f", value: this.conf.speed * this.conf.textureLength },
            uvScale:    { type: "v2", value: new THREE.Vector2( 1.0, this.conf.arrowLength ) }
        };

        var material = new THREE.ShaderMaterial( {
            uniforms:       uniforms,
            attributes:     attributes,
            transparent:    true,
            vertexShader:   document.getElementById( 'cube.vsh' ).textContent,
            fragmentShader: document.getElementById( 'transparent.fsh' ).textContent
        });
        this.uniformsArr.push(uniforms);
        return new THREE.Mesh( geometry, material );
    },
    getCollisions: function() {
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
    highlightLine: function(position) {
        this.uniformsArr.forEach(function(uniform) {
            if(uniform.position && uniform.position.value == position) {
                uniform.highlight.value = 2.0;
            } else {
                uniform.highlight.value = 1.0;
            }
        });
    },
    onRender: function(func) {
        this.onRenderFunctions.push(func);
    },

    animate: function() {
        requestAnimationFrame(this.animate.bind(this));
        this.render();
    },
    render: function() {

        this.onRenderFunctions.forEach(function(func) {
            func();
        });

        var time = new Date().getTime();
        var delta = time - this.oldTime;
        this.oldTime = time;

        if (isNaN(delta) || delta > 1000 || delta === 0 ) {
            delta = 1000/60;
        }

        var radians = this.cameraAngle * Math.PI / 180;

        //uniforms.globalTime.value += delta*0.0006;
        this.globalTime += delta * 0.0006;
        this.uniformsArr.forEach(function(uniform) {
            uniform.globalTime.value = this.globalTime;
        }.bind(this));


        //cameraTarget.x = -10 * Math.sin(time/3000);
        //cameraTarget.y = -10 * Math.cos(time/4000);

        //mesh.rotation.z += Math.abs(Math.sin(time/4000))*0.01;
        
        //mesh2.rotation.z = mesh.rotation.z;

        //camera.position.x = 13 * Math.sin(time/2000);
        //camera.position.y = 13 * Math.cos(time/2000);
        this.camera.position.x = 25 * Math.sin(radians);
        this.camera.position.y = 25 * Math.cos(radians);
        var cameraTarget = new THREE.Vector3(0,0,-70);
        this.camera.lookAt( cameraTarget );

        this.camera.up.x = -Math.sin(radians);
        this.camera.up.y = -Math.cos(radians);

        this.renderer.render(this.scene, this.camera);
    }
};

Boost = function(config) {
    this.G = new G(conf);
    this.bindKeyboard();
    this.keyboard = new THREEx.KeyboardState();
    this.G.onRender(this.checkKeyboard.bind(this));
    this.G.onRender(function() {
        var p = this.G.getCameraPosition();
        this.G.highlightLine(p);
    }.bind(this));
};

Boost.prototype = {
    setSpeed: function() {
    },
    checkKeyboard: function() {
        if(this.keyboard.pressed("left")) {
            this.G.rotateCamera(2);
        } else if(this.keyboard.pressed("right")) {
            this.G.rotateCamera(-2);
        }
    },
    bindKeyboard: function() {
    },
    bindOrientation: function() {
        window.addEventListener("deviceorientation", function(e) {
            //shift = e.beta;
        }, true);
    },
    generateObstacles: function() {
    }
};

jQuery(function(){
    new Boost();
});
