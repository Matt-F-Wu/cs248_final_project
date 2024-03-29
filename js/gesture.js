/* Statistical approach of finding hand gesture related information */

var DEMO = function(){
};

DEMO.prototype.start = function() {
  var that = this;

  this.tracker = new HT.Tracker( {fast: true} );

  this.cbxHull = document.getElementById("cbxHull");
  this.cbxDefects = document.getElementById("cbxDefects");
  this.cbxSkin = document.getElementById("cbxSkin");

  this.video = document.getElementById("video");
  this.canvas = document.getElementById("canvas");
  this.context = this.canvas.getContext("2d");

  this.canvas.width = parseInt(this.canvas.style.width) / 2;
  this.canvas.height = parseInt(this.canvas.style.height) / 2;

  this.image = this.context.createImageData(
    this.canvas.width * 0.2, this.canvas.height * 0.2);

  /*Get user's webcam handle*/
  navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

  if (navigator.getUserMedia){
    navigator.getUserMedia({video:true},
      function(stream){ return that.videoReady(stream); },
      function(error){ return that.videoError(error); } );
  }
};

DEMO.prototype.videoReady = function(stream){
  if (window.webkitURL) {
    this.video.src = window.webkitURL.createObjectURL(stream);
  } else if (video.mozSrcObject !== undefined) {
    this.video.mozSrcObject = stream;
  } else {
    this.video.src = stream;
  }

  this.tick();
};

DEMO.prototype.videoError = function(error){
};

DEMO.prototype.tick = function(){
  var that = this, image, candidate;

  /* Continuously track hand movements per animation frame*/
  requestAnimationFrame( function() { return that.tick(); } );

  if (this.video.readyState === this.video.HAVE_ENOUGH_DATA){
    image = this.snapshot();
    /* Abtain a medium quality jpg image to send to backend */
    this.canvas.toDataURL('image/jpeg', 0.5);
    candidate = this.tracker.detect(image);

    this.draw(candidate);
  }
};

DEMO.prototype.snapshot = function(){
  this.context.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);

  return this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
};

DEMO.prototype.draw = function(candidate){
  if (candidate){

    if (this.cbxHull.checked){
      console.log(candidate.hull);
      this.drawHull(candidate.hull, "red");
    }

    if (this.cbxDefects.checked){
      this.drawDefects(candidate.defects, "blue");
    }
  }

  if (this.cbxSkin.checked){
    this.context.putImageData(
      this.createImage(this.tracker.mask, this.image),
      this.canvas.width - this.image.width,
      this.canvas.height - this.image.height);
  }
};

DEMO.prototype.drawHull = function(hull, color){
  var len = hull.length, i = 1;

  if (len > 0){
    this.context.beginPath();
    this.context.strokeStyle = color;

    this.context.moveTo(hull[0].x, hull[0].y);
    for (; i < len; ++ i){
      this.context.lineTo(hull[i].x, hull[i].y);
    }

    this.context.stroke();
    this.context.closePath();
  }
};

DEMO.prototype.drawDefects = function(defects, color){
  var len = defects.length, i = 0, point;

  if (len > 0){
    this.context.beginPath();
    this.context.strokeStyle = color;

    for (; i < len; ++ i){
      point = defects[i].depthPoint;
      this.context.strokeRect(point.x - 2, point.y - 2, 4, 4);
    }

    this.context.stroke();
    this.context.closePath();
  }
};

DEMO.prototype.createImage = function(imageSrc, imageDst){
  var src = imageSrc.data, dst = imageDst.data,
      width = imageSrc.width, span = 4 * width,
      len = src.length, i = 0, j = 0, k = 0;

  for(i = 0; i < len; i += span){

    for(j = 0; j < width; j += 5){

      dst[k] = dst[k + 1] = dst[k + 2] = src[i];
      dst[k + 3] = 255;
      k += 4;

      i += 5;
    }
  }

  return imageDst;
};

window.onload = function(){
  var demo = new DEMO();
  demo.start();
};
