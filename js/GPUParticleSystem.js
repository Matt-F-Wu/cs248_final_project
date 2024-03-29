/*
 * GPU Particle System
 * @author flimshaw - Charlie Hoey - http://charliehoey.com
 *
 * A simple to use, general purpose GPU system. Particles are spawn-and-forget with
 * several options available, and do not require monitoring or cleanup after spawning.
 * Because the paths of all particles are completely deterministic once spawned, the scale
 * and direction of time is also variable.
 *
 * Currently uses a static wrapping perlin noise texture for turbulence, and a small png texture for
 * particles, but adding support for a particle texture atlas or changing to a different type of turbulence
 * would be a fairly light day's work.
 *
 * Shader and javascript packing code derrived from several Stack Overflow examples.
 *
 */

THREE.GPUParticleSystem = function ( options ) {

	THREE.Object3D.apply( this, arguments );

	options = options || {};

	// parse options and use defaults

	this.PARTICLE_COUNT = options.maxParticles || 1000000;
	this.PARTICLE_CONTAINERS = options.containerCount || 1;

	this.PARTICLE_NOISE_TEXTURE = options.particleNoiseTex || null;
	this.PARTICLE_SPRITE_TEXTURE = options.particleSpriteTex || null;

	this.PARTICLES_PER_CONTAINER = Math.ceil( this.PARTICLE_COUNT / this.PARTICLE_CONTAINERS );
	this.PARTICLE_CURSOR = 0;
	this.time = 0;
	this.particleContainers = [];
	this.rand = [];

	this.flex_position = false || options.flex_position;

	this.x_threshold = options.x_threshold || 32;
	this.y_threshold = options.y_threshold || 24;

	// custom vertex and fragement shader

	var GPUParticleShader = {

		vertexShader: [

			'uniform float uTime;',
			'uniform float uScale;',
			'uniform sampler2D tNoise;',
			'uniform float x_threshold;',
			'uniform float y_threshold;',
			'attribute vec3 positionStart;',
			'attribute float startTime;',
			'attribute vec3 velocity;',
			'attribute vec3 originalVelocity;',
			'attribute float turbulence;',
			'attribute vec3 color;',
			'attribute float size;',
			'attribute float lifeTime;',
			'attribute float rotationSpeed;',
			'attribute float rotationRadius;',

			'varying vec4 vColor;',
			'varying float lifeLeft;',

			'void main() {',

			// unpack things from our attributes'

			'	vColor = vec4( color, 1.0 );',

			// convert our velocity back into a value we can use'

			'	vec3 newPosition;',
			'	vec3 v;',

			'	float timeElapsed = uTime - startTime;',

			'	lifeLeft = 1.0 - ( timeElapsed / lifeTime );',

			'	gl_PointSize = ( uScale * size ) * lifeLeft;',

			'	v.x = ( velocity.x - 0.5 ) * 3.0;',
			'	v.y = ( velocity.y - 0.5 ) * 3.0;',
			'	v.z = ( velocity.z - 0.5 ) * 3.0;',

			'	newPosition = positionStart + ( v * 10.0 ) * timeElapsed;',

			// for spiral
			' vec3 axis_x = vec3(1, 0, 0);',
			' vec3 axis_y = vec3(0, 1, 0);',
			' vec3 base1 = cross(axis_x, originalVelocity);',
			' float eps = 0.000001;',
			' if ( abs(base1.x) < eps && abs(base1.y) < eps && abs(base1.z) < eps ) {',
			'  base1 = cross(axis_y, originalVelocity);',
			' }',
			' vec3 base2 = cross(base1, originalVelocity);',
			' base1 = normalize(base1);',
			' base2 = normalize(base2);',
			' float theta = rotationSpeed * timeElapsed;',
			' vec3 positionOffset = base1 * cos(theta) + base2 * sin(theta);',
			' newPosition += rotationRadius * positionOffset;',

			'	vec3 noise = texture2D( tNoise, vec2( newPosition.x * 0.015 + ( uTime * 0.05 ), newPosition.y * 0.02 + ( uTime * 0.015 ) ) ).rgb;',
			'	vec3 noiseVel = ( noise.rgb - 0.5 ) * 30.0;',
			'	newPosition = mix( newPosition, newPosition + vec3( noiseVel * ( turbulence * 5.0 ) ), ( timeElapsed / lifeTime ) );',

			' float x = abs(newPosition.x);',
			' float y = abs(newPosition.y);',

			'if(x > x_threshold || y > y_threshold){',

			'	float x_i = y_threshold * x / y;',
			'	float y_i = x_threshold * y / x;',

			'	if(y_i < y_threshold && x_i > x_threshold){',
			'		float x_e = (x - x_threshold);',
			'		float y_e = x_e * y / x;',
			'		if(newPosition.x > 0.){',
			'			newPosition.x -= x_e;',
			'		}else{',
			'			newPosition.x += x_e;',
			'		}',

			'		if(newPosition.y > 0.){',
			'			newPosition.y += y_e;',
			'		}else{',
			'			newPosition.y -= y_e;',
			'		}',
			'	}',

			'	if(y_i >= y_threshold && x_i <= x_threshold){',
			'		float y_e = y - y_threshold;',
			'		float x_e = x * y_e / y;',

			'		if(newPosition.x > 0.){',
			'			newPosition.x += x_e;',
			'		}else{',
			'			newPosition.x -= x_e;',
			'		}',

			'		if(newPosition.y > 0.){',
			'			newPosition.y -= y_e;',
			'		}else{',
			'			newPosition.y += y_e;',
			'		}',
			'	}',
			'}',

			'	lifeLeft *= (noise.r + 0.5);',

			'	if( v.y > 0. && v.y < .05 ) {',

			'		lifeLeft = 0.0;',

			'	}',

			'	if( v.x < - 1.45 ) {',

			'		lifeLeft = 0.0;',

			'	}',

			'	if( timeElapsed > 0.0 ) {',

			'		gl_Position = projectionMatrix * modelViewMatrix * vec4( newPosition, 1.0 );',

			'	} else {',

			'		gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
			'		lifeLeft = 0.0;',
			'		gl_PointSize = 0.;',

			'	}',

			'}'

		].join( '\n' ),

		fragmentShader: [

			'float scaleLinear( float value, vec2 valueDomain ) {',

			'	return ( value - valueDomain.x ) / ( valueDomain.y - valueDomain.x );',

			'}',

			'float scaleLinear( float value, vec2 valueDomain, vec2 valueRange ) {',

			'	return mix( valueRange.x, valueRange.y, scaleLinear( value, valueDomain ) );',

			'}',

			'varying vec4 vColor;',
			'varying float lifeLeft;',

			'uniform sampler2D tSprite;',

			'void main() {',

			'	float alpha = 0.;',

			'	if( lifeLeft > 0.995 ) {',

			'		alpha = scaleLinear( lifeLeft, vec2( 1.0, 0.995 ), vec2( 0.0, 1.0 ) );',

			'	} else {',

			'		alpha = lifeLeft * 0.75;',

			'	}',

			'	vec4 tex = texture2D( tSprite, gl_PointCoord );',
			'	gl_FragColor = vec4( vColor.rgb * tex.a, alpha * tex.a );',

			'}'

		].join( '\n' )

	};

	// preload a million random numbers

	var i;

	for ( i = 1e5; i > 0; i -- ) {

		this.rand.push( Math.random() - 0.5 );

	}

	this.random = function () {

		return ++ i >= this.rand.length ? this.rand[ i = 1 ] : this.rand[ i ];

	};

	var textureLoader = new THREE.TextureLoader();

	this.particleNoiseTex = this.PARTICLE_NOISE_TEXTURE || textureLoader.load( 'textures/perlin-512.png' );
	this.particleNoiseTex.wrapS = this.particleNoiseTex.wrapT = THREE.RepeatWrapping;

	this.particleSpriteTex = this.PARTICLE_SPRITE_TEXTURE || textureLoader.load( 'textures/particle2.png' );
	this.particleSpriteTex.wrapS = this.particleSpriteTex.wrapT = THREE.RepeatWrapping;

	this.particleShaderMat = new THREE.ShaderMaterial( {
		transparent: true,
		depthWrite: false,
		uniforms: {
			'uTime': {
				value: 0.0
			},
			'uScale': {
				value: 1.0
			},
			'tNoise': {
				value: this.particleNoiseTex
			},
			'tSprite': {
				value: this.particleSpriteTex
			},
			'x_threshold': {
				value: this.x_threshold
			},
			'y_threshold': {
				value: this.y_threshold
			}
		},
		blending: THREE.AdditiveBlending,
		vertexShader: GPUParticleShader.vertexShader,
		fragmentShader: GPUParticleShader.fragmentShader
	} );

	// define defaults for all values

	this.particleShaderMat.defaultAttributeValues.particlePositionsStartTime = [ 0, 0, 0, 0 ];
	this.particleShaderMat.defaultAttributeValues.particleVelColSizeLife = [ 0, 0, 0, 0 ];

	this.init = function () {

		for ( var i = 0; i < this.PARTICLE_CONTAINERS; i ++ ) {

			var c = new THREE.GPUParticleContainer( this.PARTICLES_PER_CONTAINER, this );
			this.particleContainers.push( c );
			this.add( c );

		}

	};

	this.spawnParticle = function ( options ) {

		this.PARTICLE_CURSOR ++;

		if ( this.PARTICLE_CURSOR >= this.PARTICLE_COUNT ) {

			this.PARTICLE_CURSOR = 1;

		}

		var currentContainer = this.particleContainers[ Math.floor( this.PARTICLE_CURSOR / this.PARTICLES_PER_CONTAINER ) ];

		currentContainer.spawnParticle( options );

		return currentContainer;

	};

	this.update = function ( time ) {

		for ( var i = 0; i < this.PARTICLE_CONTAINERS; i ++ ) {

			this.particleContainers[ i ].update( time );

		}

	};

	this.dispose = function () {

		this.particleShaderMat.dispose();
		this.particleNoiseTex.dispose();
		this.particleSpriteTex.dispose();

		for ( var i = 0; i < this.PARTICLE_CONTAINERS; i ++ ) {

			this.particleContainers[ i ].dispose();

		}

	};

	this.init();

};

THREE.GPUParticleSystem.prototype = Object.create( THREE.Object3D.prototype );
THREE.GPUParticleSystem.prototype.constructor = THREE.GPUParticleSystem;


// Subclass for particle containers, allows for very large arrays to be spread out

THREE.GPUParticleContainer = function ( maxParticles, particleSystem ) {

	THREE.Object3D.apply( this, arguments );

	this.PARTICLE_COUNT = maxParticles || 100000;
	this.PARTICLE_CURSOR = 0;
	this.time = 0;
	this.offset = 0;
	this.count = 0;
	this.DPR = window.devicePixelRatio;
	this.GPUParticleSystem = particleSystem;
	this.particleUpdate = false;

	// geometry

	this.particleShaderGeo = new THREE.BufferGeometry();

	this.particleShaderGeo.addAttribute( 'position', new THREE.BufferAttribute( new Float32Array( this.PARTICLE_COUNT * 3 ), 3 ).setDynamic( true ) );
	this.particleShaderGeo.addAttribute( 'positionStart', new THREE.BufferAttribute( new Float32Array( this.PARTICLE_COUNT * 3 ), 3 ).setDynamic( true ) );
	this.particleShaderGeo.addAttribute( 'startTime', new THREE.BufferAttribute( new Float32Array( this.PARTICLE_COUNT ), 1 ).setDynamic( true ) );
	this.particleShaderGeo.addAttribute( 'velocity', new THREE.BufferAttribute( new Float32Array( this.PARTICLE_COUNT * 3 ), 3 ).setDynamic( true ) );
	this.particleShaderGeo.addAttribute( 'originalVelocity', new THREE.BufferAttribute( new Float32Array( this.PARTICLE_COUNT * 3 ), 3 ).setDynamic( true ) );
	this.particleShaderGeo.addAttribute( 'turbulence', new THREE.BufferAttribute( new Float32Array( this.PARTICLE_COUNT ), 1 ).setDynamic( true ) );
	this.particleShaderGeo.addAttribute( 'color', new THREE.BufferAttribute( new Float32Array( this.PARTICLE_COUNT * 3 ), 3 ).setDynamic( true ) );
	this.particleShaderGeo.addAttribute( 'size', new THREE.BufferAttribute( new Float32Array( this.PARTICLE_COUNT ), 1 ).setDynamic( true ) );
	this.particleShaderGeo.addAttribute( 'lifeTime', new THREE.BufferAttribute( new Float32Array( this.PARTICLE_COUNT ), 1 ).setDynamic( true ) );
	this.particleShaderGeo.addAttribute( 'rotationSpeed', new THREE.BufferAttribute( new Float32Array( this.PARTICLE_COUNT ), 1 ).setDynamic( true ) );
	this.particleShaderGeo.addAttribute( 'rotationRadius', new THREE.BufferAttribute( new Float32Array( this.PARTICLE_COUNT ), 1 ).setDynamic( true ) );
	// Use unsigned int, 1 byte, to save memory
	this.particleShaderGeo.addAttribute( 'bounce', new THREE.BufferAttribute( new Float32Array( this.PARTICLE_COUNT ), 1 ).setDynamic( true ) );

	// material

	this.particleShaderMat = this.GPUParticleSystem.particleShaderMat;

	var position = new THREE.Vector3();
	var velocity = new THREE.Vector3();
	var color = new THREE.Color();

	this.spawnParticle = function ( options ) {
		var positionAttribute = this.particleShaderGeo.getAttribute( 'position' );
		var positionStartAttribute = this.particleShaderGeo.getAttribute( 'positionStart' );
		var startTimeAttribute = this.particleShaderGeo.getAttribute( 'startTime' );
		var velocityAttribute = this.particleShaderGeo.getAttribute( 'velocity' );
		var originalVelocityAttribute = this.particleShaderGeo.getAttribute( 'originalVelocity' );
		var turbulenceAttribute = this.particleShaderGeo.getAttribute( 'turbulence' );
		var colorAttribute = this.particleShaderGeo.getAttribute( 'color' );
		var sizeAttribute = this.particleShaderGeo.getAttribute( 'size' );
		var lifeTimeAttribute = this.particleShaderGeo.getAttribute( 'lifeTime' );
		var rotationSpeedAttribute = this.particleShaderGeo.getAttribute( 'rotationSpeed' );
		var rotationRadiusAttribute = this.particleShaderGeo.getAttribute( 'rotationRadius' );
		var bounceAttribute = this.particleShaderGeo.getAttribute( 'bounce' );

		options = options || {};

		// setup reasonable default values for all arguments

		position = options.position !== undefined ? position.copy( options.position ) : position.set( 0, 0, 0 );
		velocity = options.velocity !== undefined ? velocity.copy( options.velocity ) : velocity.set( 0, 0, 0 );
		color = options.color !== undefined ? color.set( options.color ) : color.set( 0xffffff );

		var positionRandomness = options.positionRandomness !== undefined ? options.positionRandomness : 0;
		var velocityRandomness = options.velocityRandomness !== undefined ? options.velocityRandomness : 0;
		var colorRandomness = options.colorRandomness !== undefined ? options.colorRandomness : 1;
		var turbulence = options.turbulence !== undefined ? options.turbulence : 1;
		var lifetime = options.lifetime !== undefined ? options.lifetime : 5;
		var size = options.size !== undefined ? options.size : 10;
		var sizeRandomness = options.sizeRandomness !== undefined ? options.sizeRandomness : 0;
		var smoothPosition = options.smoothPosition !== undefined ? options.smoothPosition : false;
		// Hao: deals with bounce state here
		var bounce = options.bounce !== undefined ? options.bounce : bounceAttribute[i] === undefined? 0 : bounceAttribute[i];
		var rotationSpeed = options.rotationSpeed !== undefined ? options.rotationSpeed : 10;
		var rotationRadius = options.rotationRadius !== undefined ? options.rotationRadius : 1;

		if ( this.DPR !== undefined ) size *= this.DPR;

		// Hao: This is the current particle that we are operating at
		var i = this.PARTICLE_CURSOR;

		// start position noise

		positionStartAttribute.array[ i * 3 + 0 ] = position.x + ( particleSystem.random() * positionRandomness );
		positionStartAttribute.array[ i * 3 + 1 ] = position.y + ( particleSystem.random() * positionRandomness );
		positionStartAttribute.array[ i * 3 + 2 ] = position.z + ( particleSystem.random() * positionRandomness );

		if ( smoothPosition === true ) {

			positionStartAttribute.array[ i * 3 + 0 ] += - ( velocity.x * particleSystem.random() );
			positionStartAttribute.array[ i * 3 + 1 ] += - ( velocity.y * particleSystem.random() );
			positionStartAttribute.array[ i * 3 + 2 ] += - ( velocity.z * particleSystem.random() );

		}

		// velocity

		var maxVel = 2;

		var velX;
		var velY;
		var velZ;

		velX = velocity.x + particleSystem.random() * velocityRandomness;
		velY = velocity.y + particleSystem.random() * velocityRandomness;
		velZ = velocity.z + particleSystem.random() * velocityRandomness;

		velX = THREE.Math.clamp( ( velX - ( - maxVel ) ) / ( maxVel - ( - maxVel ) ), 0, 1 );
		velY = THREE.Math.clamp( ( velY - ( - maxVel ) ) / ( maxVel - ( - maxVel ) ), 0, 1 );
		velZ = THREE.Math.clamp( ( velZ - ( - maxVel ) ) / ( maxVel - ( - maxVel ) ), 0, 1 );

		// let uTime = this.particleShaderMat.uniforms.uTime.value;
		// let timeElapsed = uTime - startTimeAttribute.array[ i ];
		// let newPosition = new THREE.Vector3();
		// let x = positionStartAttribute.array[ i * 3 + 0 ]? positionStartAttribute.array[ i * 3 + 0 ] : 0;
		// let y = positionStartAttribute.array[ i * 3 + 1 ]? positionStartAttribute.array[ i * 3 + 1 ] : 0;
		// let z = positionStartAttribute.array[ i * 3 + 2 ]? positionStartAttribute.array[ i * 3 + 2 ]: 0;
		// newPosition.x = x + ( velX * 10.0 ) * timeElapsed;
		// newPosition.y = y + ( velY * 10.0 ) * timeElapsed;
		// newPosition.z = z + ( velZ * 10.0 ) * timeElapsed;
		// // Hao: don't really have to update the attributes
		// // positionAttribute.array[i*3 + 0] = newPosition.x;
		// // positionAttribute.array[i*3 + 1] = newPosition.y;
		// // positionAttribute.array[i*3 + 2] = newPosition.z;

		// // Hao: if this particle is bouncing

		// bounce = 1: hit left-rigt wall, reflect only x and z
		// bounce = 2: hit top-bottom wall, reflect only y and z
		// bounce = 3: after hit, decelerate and die

		// if(newPosition.x > 30 || newPosition.x < -30){
		// 	velX = -1.0 * velocity.x;
		// 	velZ = -1.0 * velocity.z;
		// 	// Random attenuation of velocity
		// 	velX = velX * 0.6 * Math.random();
		// 	// affected by gravity, mimic this with a small multiplier
		// 	velY = velY * 1.2 * Math.random();
		// 	// velZ = velZ * 0.6 * Math.random();
		// }else if(newPosition.y > 30 || newPosition.y < -30){
		// 	velY = -1.0 * velocity.y;
		// 	velZ = -1.0 * velocity.z;
		// 	// Random attenuation of velocity
		// 	velX = velX * 0.6 * Math.random();
		// 	// affected by gravity, mimic this with a small multiplier
		// 	velY = velY * 1.2 * Math.random();
		// 	// velZ = velZ * 0.6 * Math.random();
		// }else{
		// 	// Do nothing
		// }

		// velX = THREE.Math.clamp( ( velX - ( - maxVel ) ) / ( maxVel - ( - maxVel ) ), 0, 1 );
		// velY = THREE.Math.clamp( ( velY - ( - maxVel ) ) / ( maxVel - ( - maxVel ) ), 0, 1 );
		// velZ = THREE.Math.clamp( ( velZ - ( - maxVel ) ) / ( maxVel - ( - maxVel ) ), 0, 1 );

		velocityAttribute.array[ i * 3 + 0 ] = velX;
		velocityAttribute.array[ i * 3 + 1 ] = velY;
		velocityAttribute.array[ i * 3 + 2 ] = velZ;

		originalVelocityAttribute.array[ i * 3 + 0 ] = velocity.x;
		originalVelocityAttribute.array[ i * 3 + 1 ] = velocity.y;
		originalVelocityAttribute.array[ i * 3 + 2 ] = velocity.z;


		// color

		color.r = THREE.Math.clamp( color.r + particleSystem.random() * colorRandomness, 0, 1 );
		color.g = THREE.Math.clamp( color.g + particleSystem.random() * colorRandomness, 0, 1 );
		color.b = THREE.Math.clamp( color.b + particleSystem.random() * colorRandomness, 0, 1 );

		colorAttribute.array[ i * 3 + 0 ] = color.r;
		colorAttribute.array[ i * 3 + 1 ] = color.g;
		colorAttribute.array[ i * 3 + 2 ] = color.b;

		// turbulence, size, lifetime and starttime

		turbulenceAttribute.array[ i ] = turbulence;
		sizeAttribute.array[ i ] = size + particleSystem.random() * sizeRandomness;
		lifeTimeAttribute.array[ i ] = lifetime;
		startTimeAttribute.array[ i ] = this.time + particleSystem.random() * 2e-2;

		// spiral
		rotationSpeedAttribute.array[ i ] = rotationSpeed;
		rotationRadiusAttribute.array[ i ] = rotationRadius;

		// offset

		if ( this.offset === 0 ) {

			this.offset = this.PARTICLE_CURSOR;

		}

		// counter and cursor

		this.count ++;
		this.PARTICLE_CURSOR ++;

		if ( this.PARTICLE_CURSOR >= this.PARTICLE_COUNT ) {

			this.PARTICLE_CURSOR = 0;

		}

		this.particleUpdate = true;

	};

	this.init = function () {

		this.particleSystem = new THREE.Points( this.particleShaderGeo, this.particleShaderMat );
		this.particleSystem.frustumCulled = false;
		this.add( this.particleSystem );

	};

	this.update = function ( time ) {

		this.time = time;
		this.particleShaderMat.uniforms.uTime.value = time;

		this.geometryUpdate();

	};

	this.geometryUpdate = function () {

		if ( this.particleUpdate === true ) {

			this.particleUpdate = false;

			var positionStartAttribute = this.particleShaderGeo.getAttribute( 'positionStart' );
			var startTimeAttribute = this.particleShaderGeo.getAttribute( 'startTime' );
			var velocityAttribute = this.particleShaderGeo.getAttribute( 'velocity' );
			var originalVelocityAttribute = this.particleShaderGeo.getAttribute( 'originalVelocity' );
			var turbulenceAttribute = this.particleShaderGeo.getAttribute( 'turbulence' );
			var colorAttribute = this.particleShaderGeo.getAttribute( 'color' );
			var sizeAttribute = this.particleShaderGeo.getAttribute( 'size' );
			var lifeTimeAttribute = this.particleShaderGeo.getAttribute( 'lifeTime' );
			var rotationSpeedAttribute = this.particleShaderGeo.getAttribute( 'rotationSpeed' );
			var rotationRadiusAttribute = this.particleShaderGeo.getAttribute( 'rotationRadius' );
			var bounceAttribute = this.particleShaderGeo.getAttribute( 'bounce' );

			if ( this.offset + this.count < this.PARTICLE_COUNT ) {

				positionStartAttribute.updateRange.offset = this.offset * positionStartAttribute.itemSize;
				startTimeAttribute.updateRange.offset = this.offset * startTimeAttribute.itemSize;
				velocityAttribute.updateRange.offset = this.offset * velocityAttribute.itemSize;
				originalVelocityAttribute.updateRange.offset = this.offset * originalVelocityAttribute.itemSize;
				turbulenceAttribute.updateRange.offset = this.offset * turbulenceAttribute.itemSize;
				colorAttribute.updateRange.offset = this.offset * colorAttribute.itemSize;
				sizeAttribute.updateRange.offset = this.offset * sizeAttribute.itemSize;
				lifeTimeAttribute.updateRange.offset = this.offset * lifeTimeAttribute.itemSize;
				rotationSpeedAttribute.updateRange.offset = this.offset * rotationSpeedAttribute.itemSize;
				rotationRadiusAttribute.updateRange.offset = this.offset * rotationRadiusAttribute.itemSize;
				bounceAttribute.updateRange.offset = this.offset * bounceAttribute.itemSize;

				positionStartAttribute.updateRange.count = this.count * positionStartAttribute.itemSize;
				startTimeAttribute.updateRange.count = this.count * startTimeAttribute.itemSize;
				velocityAttribute.updateRange.count = this.count * velocityAttribute.itemSize;
				originalVelocityAttribute.updateRange.count = this.count * originalVelocityAttribute.itemSize;
				turbulenceAttribute.updateRange.count = this.count * turbulenceAttribute.itemSize;
				colorAttribute.updateRange.count = this.count * colorAttribute.itemSize;
				sizeAttribute.updateRange.count = this.count * sizeAttribute.itemSize;
				lifeTimeAttribute.updateRange.count = this.count * lifeTimeAttribute.itemSize;
				rotationSpeedAttribute.updateRange.count = this.count * rotationSpeedAttribute.itemSize;
				rotationRadiusAttribute.updateRange.count = this.count * rotationRadiusAttribute.itemSize;
				bounceAttribute.updateRange.count = this.count * bounceAttribute.itemSize;

			} else {

				positionStartAttribute.updateRange.offset = 0;
				startTimeAttribute.updateRange.offset = 0;
				velocityAttribute.updateRange.offset = 0;
				originalVelocityAttribute.updateRange.offset = 0;
				turbulenceAttribute.updateRange.offset = 0;
				colorAttribute.updateRange.offset = 0;
				sizeAttribute.updateRange.offset = 0;
				lifeTimeAttribute.updateRange.offset = 0;
				rotationSpeedAttribute.updateRange.offset = 0;
				rotationRadiusAttribute.updateRange.offset = 0;

				// Use -1 to update the entire buffer, see #11476
				positionStartAttribute.updateRange.count = - 1;
				startTimeAttribute.updateRange.count = - 1;
				velocityAttribute.updateRange.count = - 1;
				originalVelocityAttribute.updateRange.count = - 1;
				turbulenceAttribute.updateRange.count = - 1;
				colorAttribute.updateRange.count = - 1;
				sizeAttribute.updateRange.count = - 1;
				lifeTimeAttribute.updateRange.count = - 1;
				rotationSpeedAttribute.updateRange.count = - 1;
				rotationRadiusAttribute.updateRange.count = - 1;
				bounceAttribute.updateRange.count = - 1;
			}

			positionStartAttribute.needsUpdate = true;
			startTimeAttribute.needsUpdate = true;
			velocityAttribute.needsUpdate = true;
			originalVelocityAttribute.needsUpdate = true;
			turbulenceAttribute.needsUpdate = true;
			colorAttribute.needsUpdate = true;
			sizeAttribute.needsUpdate = true;
			lifeTimeAttribute.needsUpdate = true;
			rotationSpeedAttribute.needsUpdate = true;
			rotationRadiusAttribute.needsUpdate = true;
			bounceAttribute.needsUpdate = true;

			this.offset = 0;
			this.count = 0;

		}

	};

	// Hao: Set a flag to tell the system that bouncing is now in effect
	this.setBounceStart = () => {

	}

	this.dispose = function () {

		this.particleShaderGeo.dispose();

	};

	this.init();

};

THREE.GPUParticleContainer.prototype = Object.create( THREE.Object3D.prototype );
THREE.GPUParticleContainer.prototype.constructor = THREE.GPUParticleContainer;
