import * as THREE from 'three';
import CameraControls from 'camera-controls';

CameraControls.install({ THREE: THREE });
export class CameraControlsManager {
  private _controls: CameraControls;
  private _camera: THREE.PerspectiveCamera;

  constructor(
    canvasOrDomElement: HTMLCanvasElement | HTMLElement,
    camera: THREE.PerspectiveCamera,
    options?: { lockPolarAngle?: boolean },
  ) {
    this._controls = new CameraControls(camera, canvasOrDomElement);
    this._camera = camera;
    this._camera.add(new THREE.PointLight(0xffffff, 0.3));

    options?.lockPolarAngle && this._lockPolarAngle();
  }

  private _lockPolarAngle() {
    this._controls.minPolarAngle = Math.PI / 2;
    this._controls.maxPolarAngle = Math.PI / 2;
  }

  private _getPaddingInCssPixel = ({
    rendererHeight,
    obj,
    padding,
  }: {
    rendererHeight: number;
    obj: THREE.Object3D;
    padding: {
      top: number;
      right: number;
      bottom: number;
      left: number;
    };
  }) => {
    const { top, right, bottom, left } = padding;
    const fov = this._camera.fov * THREE.MathUtils.DEG2RAD;
    const boundingBox = new THREE.Box3().setFromObject(obj);
    const size = boundingBox.getSize(new THREE.Vector3());
    const boundingWidth = size.x;
    const boundingHeight = size.y;
    const boundingDepth = size.z;

    var distanceToFit = this.controls.getDistanceToFitBox(
      boundingWidth,
      boundingHeight,
      boundingDepth,
    );
    var paddingTop = 0;
    var paddingBottom = 0;
    var paddingLeft = 0;
    var paddingRight = 0;

    for (var i = 0; i < 10; i++) {
      const depthAt = distanceToFit - boundingDepth * 0.5;
      const cssPixelToUnit = (2 * Math.tan(fov * 0.5) * Math.abs(depthAt)) / rendererHeight;
      paddingTop = top * cssPixelToUnit;
      paddingBottom = bottom * cssPixelToUnit;
      paddingLeft = left * cssPixelToUnit;
      paddingRight = right * cssPixelToUnit;

      distanceToFit = this.controls.getDistanceToFitBox(
        boundingWidth + paddingLeft + paddingRight,
        boundingHeight + paddingTop + paddingBottom,
        boundingDepth,
      );
    }

    return {
      padding: {
        top: paddingTop,
        bottom: paddingBottom,
        left: paddingLeft,
        right: paddingRight,
      },
      distanceToFit,
    };
  };

  rotateTo = (
    rotation: {
      azimuthAngle?: number;
      polarAngle?: number;
    },
    transition = false,
  ) => {
    if (rotation.azimuthAngle !== undefined && rotation.polarAngle !== undefined) {
      this.controls.rotateTo(rotation.azimuthAngle, rotation.polarAngle, transition);
    } else {
      rotation.azimuthAngle !== undefined &&
        this.controls.rotateAzimuthTo(rotation.azimuthAngle, transition);

      rotation.polarAngle !== undefined &&
        this.controls.rotatePolarTo(rotation.polarAngle, transition);
    }
  };

  paddingInCssPixelAndMoveControl = ({
    rendererHeight,
    obj,
    padding,
    rotationTo,
    transition = false,
  }: {
    rendererHeight: number;
    obj?: THREE.Object3D;
    padding: {
      top: number;
      right: number;
      bottom: number;
      left: number;
    };
    rotationTo?: {
      azimuthAngle?: number;
      polarAngle?: number;
    };
    transition?: boolean;
  }) => {
    if (!obj) {
      throw new Error('obj is required');
    }
    const { padding: newPadding } = this._getPaddingInCssPixel({ rendererHeight, obj, padding });
    this.fitToBounds({ obj, padding: newPadding, transition });
    rotationTo && this.rotateTo(rotationTo, transition);
  };

  fitToBounds = ({
    obj,
    padding,
    transition = false,
  }: {
    obj: THREE.Object3D;
    padding: {
      top: number;
      right: number;
      bottom: number;
      left: number;
    };
    transition?: boolean;
  }) => {
    this.controls.fitToBox(obj, transition, {
      paddingLeft: padding.left,
      paddingRight: padding.right,
      paddingBottom: padding.bottom,
      paddingTop: padding.top,
    });
  };

  private _setDistanceLimits = (minDistance: number, maxDistance: number) => {
    this._controls.minDistance = minDistance;
    this._controls.maxDistance = maxDistance;
  };

  setDistanceLimitsFromSize = (size: THREE.Vector3) => {
    this._setDistanceLimits(
      Math.min(size.x, size.y, size.z) * 1.1,
      Math.max(size.x, size.y, size.z),
    );
  };

  setDevMode(isDevMode: boolean) {
    //FIXME: use isDevMode for below
    this._controls.mouseButtons.wheel =
      this._controls.mouseButtons.wheel === CameraControls.ACTION.NONE
        ? CameraControls.ACTION.ZOOM
        : CameraControls.ACTION.NONE;
    this._controls.touches.two =
      this._controls.touches.two === CameraControls.ACTION.TOUCH_ROTATE
        ? CameraControls.ACTION.TOUCH_DOLLY
        : CameraControls.ACTION.TOUCH_ROTATE;
    this._controls.minPolarAngle = isDevMode ? 0 : Math.PI / 2;
    this._controls.maxPolarAngle = isDevMode ? Math.PI : Math.PI / 2;
  }

  update(clockOrDelta: THREE.Clock | number) {
    const delta = clockOrDelta instanceof THREE.Clock ? clockOrDelta.getDelta() : clockOrDelta;
    this._controls.update(delta);
  }

  get controls() {
    return this._controls;
  }
}
