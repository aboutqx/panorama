import EaseNumber from '../EaseNumber'

const getMouse = function (mEvent, mTarget, finger2) {

	const o = mTarget || {};
	if (mEvent.touches&&!finger2) {
		o.x = mEvent.touches[0].pageX;
		o.y = mEvent.touches[0].pageY;
	} else if (!mEvent.touches) {
		o.x = mEvent.clientX;
		o.y = mEvent.clientY;

	} else if(mEvent.touches&&finger2) {
		o.x = mEvent.touches[1].pageX;
		o.y = mEvent.touches[1].pageY;
	}

	return o;
}
export default class OrbitalControl {
	_preRx = 0
	_preRy = 0
	_mouse = {}
	_preMouse = {}
	_finger2Mouse = {}
	_isLockRotation = false
	_isLockZoom = false
	sensitivity = 1.
	_up = new THREE.Vector3(0, 1, 0)
	center = new THREE.Vector3()

	constructor(mTarget, mListenerTarget = window, mRadius = 500) {

		this._target = mTarget
		this.fov = new EaseNumber(this._target.fov)
		this._rx = new EaseNumber(0)
		this._rx.limit(-Math.PI / 12, Math.PI / 12)
		this._ry = new EaseNumber(0)
		this.radius = new EaseNumber(mRadius);
		this.position = new THREE.Vector3(0, 0, this.radius.value);

		this._listenerTarget = mListenerTarget

		this._listenerTarget.addEventListener('mousewheel', (e) => this._onWheel(e), {
			passive: false
		});
		this._listenerTarget.addEventListener('DOMMouseScroll', (e) => this._onWheel(e));

		this._listenerTarget.addEventListener('mousedown', (e) => this._onDown(e));
		this._listenerTarget.addEventListener('touchstart', (e) => this._onDown(e));
		this._listenerTarget.addEventListener('mousemove', (e) => this._onMove(e));
		this._listenerTarget.addEventListener('touchmove', (e) => this._onMove(e));

		window.addEventListener('touchend', () => this._onUp());
		window.addEventListener('mouseup', () => this._onUp());

	}
	
	lockRotation(mValue = true) {
		this._isLockRotation = mValue;
	}

	_onDown(mEvent) {
		if (this._isLockRotation) {
			return;
		}
		this._isMouseDown = true;
		getMouse(mEvent, this._mouse);
		getMouse(mEvent, this._preMouse);
		if (mEvent.touches && mEvent.touches.length !== 1) {
			getMouse(mEvent, this._finger2Mouse, 'finger2')
		}
		this._preRX = this._rx.targetValue;
		this._preRY = this._ry.targetValue;
	}

	_onMove(mEvent) {
		if (this._isLockRotation) {
			return;
		}
		getMouse(mEvent, this._mouse);

		if (mEvent.touches) {
			mEvent.preventDefault();
		}
		//two finger pich
		if (mEvent.touches && mEvent.touches.length !== 1) {
			//首先计算出按下时两个手指的距离
			let downDistance = this._getRange(this._preMouse, this._finger2Mouse);

			//然后计算出移动后的两指的距离
			let moveDistance = this._getRange(this._mouse, {
				x: mEvent.touches[1].pageX,
				y: mEvent.touches[1].pageY
			})
			// alert(moveDistance - downDistance)
			this.fov.value -= (moveDistance - downDistance) *.06

		} else if (this._isMouseDown) {
			let diffX = -(this._mouse.x - this._preMouse.x);
			if (this._isInvert) {
				diffX *= -1;
			}
			this._ry.value = this._preRY - diffX * 0.01 * this.sensitivity;

			let diffY = -(this._mouse.y - this._preMouse.y);
			if (this._isInvert) {
				diffY *= -1;
			}
			this._rx.value = this._preRX - diffY * 0.01 * this.sensitivity;
		}
		
	}

	_getRange(finger1, finger2) {
		let distance = Math.sqrt(Math.pow((finger2.x - finger1.x) ,2) + Math.pow((finger2.x - finger1.y),2))
		return distance
	}

	_onUp() {
		if (this._isLockRotation) {
			return;
		}
		this._isMouseDown = false;
	}

	_onWheel(mEvent) {
		let o = {}
		getMouse(mEvent, o)
		if(o.x<=window.innerWidth&&o.y<=window.innerHeight){
			mEvent.preventDefault()
		}
		
		if (this._isLockZoom) {
			return;
		}
		const w = mEvent.wheelDelta;
		const d = mEvent.detail;
		let value = 0;
		if (d) {
			if (w) {
				value = w / d / 40 * d > 0 ? 1 : -1; // Opera
			} else {
				value = -d / 3; // Firefox;         TODO: do not /3 for OS X
			}
		} else {
			value = w / 120;
		}
		
		this.fov.value -=value*3
	}

	update() {
		this.position[1] = Math.sin(this._rx.value) * this.radius.value;
		const tr = Math.cos(this._rx.value) * this.radius.value;
		this.position[0] = Math.cos(this._ry.value + Math.PI * 0.5) * tr; //+90度纠正方向
		this.position[2] = Math.sin(this._ry.value + Math.PI * 0.5) * tr;

		
		this._target.lookAt(this.position[0], this.position[1], this.position[2])
		this._target.fov = this.fov.value
		this._target.updateProjectionMatrix()
	}

	get rx() {
		return this._rx;
	}


	get ry() {
		return this._ry;
	}
}