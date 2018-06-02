const getHullDefectVertices = (candidate) => {
  const defects = candidate.defects;
  const handContourPoints = candidate.contour;

  // get neighbor defect points of each hull point
  const hullPointDefectNeighbors = new Map(candidate.hull.map(hullPoint => [hullPoint, []]));
  
  defects.forEach((defect) => {
    const start = defect.start;
    const end = defect.end;
    const defectPoint = defect.depthPoint;
    hullPointDefectNeighbors.get(start).push(defectPoint);
    hullPointDefectNeighbors.get(end).push(defectPoint);
  });

  return Array.from(hullPointDefectNeighbors.keys())
    // only consider hull points that have 2 neighbor defects
    .filter(hullPoint => hullPointDefectNeighbors.get(hullPoint).length > 1)
    // return vertex points
    .map((hullPoint) => {
      const defectNeighbors = hullPointDefectNeighbors.get(hullPoint);
      return ({
        pt: hullPoint,
        d1: defectNeighbors[0],
        d2: defectNeighbors[1]
      });
    });
};

function vectorNorm(p1, p2){
  return ((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2) ** 0.5;
}

const filterVerticesByAngle = (vertices, maxAngleDeg) =>
  vertices.filter((v) => {
    const sq = x => x * x;
    const a = vectorNorm(v.d1, v.d2);
    const b = vectorNorm(v.pt, v.d1);
    const c = vectorNorm(v.pt, v.d2);
    const angleDeg = Math.acos(((sq(b) + sq(c)) - sq(a)) / (2 * b * c)) * (180 / Math.PI);
    return angleDeg < maxAngleDeg;
  });

// 
function frameAnalyzer(width, height, pixels){
  let frame = new CV.Image(width, height, pixels);
  
  let tracker = new HT.Tracker();

  let candidate = tracker.detect(frame);

  console.debug(candidate);

  let vertices = getHullDefectVertices(candidate);

  let fingers = filterVerticesByAngle(vertices, 60);

  // display detection result
  const numFingersUp = fingers.length;

  console.debug("Num fingers detected: " + numFingersUp);
  
};

function downSampler(image, ow, oh, tw, th){
  //Given an array of RGBA values of image size ow by oh, downsample to tw by th
  let result = new Uint8Array(tw * th * 4);
  let scale_w = Math.floor(ow/tw);
  let scale_h = Math.floor(oh/th);
  var o_idx, n_idx;
  for(let i = 0; i < th; i++){
    for(let j = 0; j < tw; j++){
      o_idx = (i*scale_h*ow + j*scale_w) * 4;
      n_idx = (i*tw + j)*4;
      result[n_idx] = image[o_idx];
      result[n_idx + 1] = image[o_idx + 1];
      result[n_idx + 2] = image[o_idx + 2];
      result[n_idx + 3] = image[o_idx + 3];
    }
  }
  return result;
}