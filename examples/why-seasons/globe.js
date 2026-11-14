// The Earth of this film: the globe from the langit-biru example (NASA's maps), with what a film about seasons
// needs added to it: an axis you can see, the equator, the 40th parallel, a mark for noon on that parallel, and a
// Sun that can be anywhere around it. Everything is drawn from plain state.
//
// The geometry is one scene seen from one side. The orbit lies in a plane the camera looks down on from `e` degrees
// above it; the Earth is at `theta` degrees around the Sun (0 = December, on the right; 180 = June, on the left); the
// axis leans `eps` degrees from the orbit's upright, always toward the right of the frame. The Sun's direction and
// the axis follow from those three numbers, so the light on the globe is never set by hand.
import { createEarth } from "../langit-biru/earth.js";

const rad = (deg) => (deg * Math.PI) / 180;
export const LAT = 40;

export async function createGlobe(canvas) {
  const earth = await createEarth(canvas);
  const { space, R } = earth;
  const { THREE } = space;
  // The example's globe keeps its group and its Sun to itself; they are found in the scene it built.
  const group = space.scene.children.find((child) => child.isGroup);
  const sun = group.children[0].material.uniforms.uSun.value;
  const UP = new THREE.Vector3(0, 1, 0);
  const axisV = new THREE.Vector3();
  const side = new THREE.Vector3();

  const paint = (colour) => new THREE.MeshBasicMaterial({ color: colour, transparent: true, toneMapped: false });
  const marks = new THREE.Group(); // turns with the axis
  const free = new THREE.Group(); // keeps the frame's directions
  space.scene.add(marks, free);
  const REACH = 1.38;
  const axis = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 2 * R * REACH, 14), paint(0xffb43a));
  const cap = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), paint(0xffd58a));
  const equator = new THREE.Mesh(new THREE.TorusGeometry(R * 1.004, 0.045, 8, 220), paint(0xffffff));
  equator.rotation.x = Math.PI / 2;
  const parallel = new THREE.Mesh(new THREE.TorusGeometry(R * 1.004 * Math.cos(rad(LAT)), 0.055, 8, 200), paint(0xffb43a));
  parallel.rotation.x = Math.PI / 2;
  parallel.position.y = R * 1.004 * Math.sin(rad(LAT));
  marks.add(axis, cap, equator, parallel);
  const dot = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), paint(0xffffff));
  const dotRing = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), paint(0xffb43a));
  // The white core is drawn over its amber ring, whatever the depth says.
  dot.material.depthTest = false;
  dot.renderOrder = 5;
  free.add(dotRing, dot);

  return {
    space,
    R,
    REACH,
    // s: the globe's own state (vis, x, y, size, turn, tilt, air, thick), as in the example.
    // g: theta, e, eps (degrees); axis (the axis line's width in pixels); reach (how far it sticks out, in globe
    //    radii from the centre); eq, lat (ring opacities); dot (0 to 1);
    //    roll (degrees the camera rolls, so the picture turns anticlockwise by that much).
    render(s, g, t) {
      const th = rad(g.theta);
      const e = rad(g.e);
      const eps = rad(g.eps);
      sun.set(-Math.cos(th), -Math.sin(th) * Math.sin(e), Math.sin(th) * Math.cos(e)).normalize();
      axisV.set(Math.sin(eps), Math.cos(eps) * Math.cos(e), Math.cos(eps) * Math.sin(e)).normalize();
      group.quaternion.setFromUnitVectors(UP, axisV);
      const scale = s.size / (2 * R * space.UNIT);
      const px = 1 / (space.UNIT * scale); // one pixel, in the globe's own units
      for (const set of [marks, free]) {
        set.position.copy(space.at(s.x, s.y));
        set.scale.setScalar(scale);
      }
      marks.quaternion.copy(group.quaternion);
      axis.visible = cap.visible = g.axis > 0.05;
      const reach = g.reach ?? REACH;
      axis.scale.set((g.axis / 2) * px, reach / REACH, (g.axis / 2) * px);
      cap.scale.setScalar(g.axis * 1.15 * px);
      cap.position.y = R * reach;
      equator.visible = g.eq > 0.01;
      equator.material.opacity = g.eq;
      parallel.visible = g.lat > 0.01;
      parallel.material.opacity = g.lat;
      // Noon at 40 N: the point of that parallel that faces the Sun.
      side.copy(sun).addScaledVector(axisV, -sun.dot(axisV)).normalize();
      dot.visible = dotRing.visible = g.dot > 0.01;
      const at = R * 1.008;
      dot.position.copy(side).multiplyScalar(at * Math.cos(rad(LAT))).addScaledVector(axisV, at * Math.sin(rad(LAT)));
      dotRing.position.copy(dot.position);
      dot.scale.setScalar(Math.max(1e-4, 7 * px * g.dot));
      dotRing.scale.setScalar(Math.max(1e-4, 12 * px * g.dot));
      space.camera.rotation.z = -rad(g.roll ?? 0);
      earth.render(s, t);
    },
  };
}
