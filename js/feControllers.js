const dur = 0.3;
const timeout = 500;
const oneRotation = 360;
const morphRadiusRatio = 5;
const LIGHTING_COLOR = "lighting-color";
const FLOOD_COLOR = "flood-color";
const FLOOD_OPACITY = "flood-opacity";
const CLIP_PATH = "clip-path";
const OVERLAP_THRESHOLD = "20%";

const gridWidth = 50;
const gridHeight = 50;
const controllerCenter = 25;
const imageArr = [
  "/assets/sketches/Black and Red 02.png",
  "/assets/sketches/Bubbles 2.png",
  "/assets/sketches/Plant 1.png",
  "/assets/sketches/Shapes 1.png",
  "/assets/sketches/Shapes 2.png",
];

let gridRows = 7,
  gridColumns = 14,
  i,
  x,
  y;
const grid = document.getElementById("deadBoard");
const wireLayer = document.getElementById("wireLayer");
const filterDefs = document.getElementById("filterDefs");

//FIXME: should be in lib
getCssVar = function (value) {
  return window.getComputedStyle(document.body).getPropertyValue(value).trim();
};

randomColor = function () {
  colors = [
    "--R",
    "--G",
    "--B",
    "--A",
    "--yellow",
    "--green-dark",
    "--blue-dark",
  ];
  return getCssVar(gsap.utils.random(colors));
};

nextArrayElement = function (arr, el) {
  return gsap.utils.wrap(arr, arr.indexOf(el) + 1);
};

class Controller {
  constructor(id, index) {
    this.id = id;
    this.initVars();
    this.controllerId = this.id + "Controller";
    this.triggerId = this.id + "Trigger";
    this.initX = controllerArr[index].initX;
    this.initY = controllerArr[index].initY;
    this.controllerArrayIndex = index;
    this.controller = this.createController();
    $(this.controller).addClass("controller");
    this.initController(this.controller, this.initX, this.initY);
  }
  initController(group, xPos, yPos) {
    $(group).data("class", this);
    gsap.set(group, { x: gridWidth * xPos, y: gridHeight * yPos });
    grid.appendChild(group);
  }
  resetController() {
    setTimeout(() => {
      //needs to grab it by classs so anything attached comes with it
      gsap.to(`.${this.controllerId}`, {
        x: this.initX * gridWidth,
        y: this.initY * gridHeight,
      });
    }, timeout);
  }
  dragController(target, trigger) {
    let thisClass = this;
    return Draggable.create(target, {
      type: "x,y",
      edgeResistance: 0.9,
      bounds: grid,
      inertia: true,
      trigger: trigger,
      snap: {
        x: function (endValue) {
          return Math.round(endValue / gridWidth) * gridWidth;
        },
        y: function (endValue) {
          return Math.round(endValue / gridHeight) * gridHeight;
        },
      },
      onDragEnd: function (e) {
        let feControllersAndSockets = $(".filterElementController").add(
          $(".filterSocket")
        );
        let i = feControllersAndSockets.length;
        while (--i > -1) {
          if (
            this.hitTest(feControllersAndSockets[i], OVERLAP_THRESHOLD) &&
            $(this.target).hasClass("territorial")
          ) {
            thisClass.resetController();
          }
        }
      },
    });
  }
  attrKnob(targetId, attribute, params) {
    let thisClass = this;
    let offset = params.offset ? params.offset : 0;
    let multiplyer = params.multiplyer ? params.multiplyer : 1;

    Draggable.create(targetId, {
      type: "rotation",
      bounds: {
        minRotation: params.minRotation ? params.minRotation : 0,
        maxRotation: params.maxRotation ? params.maxRotation : oneRotation,
      },
      onDrag: function () {
        gsap.set(thisClass.fe, {
          attr: {
            [attribute]: (this.rotation + offset) * multiplyer,
          },
        });
      },
    });
  }
  attrSlider(targetId, attribute, params) {
    let thisClass = this;
    let offset = params.offset ? params.offset : 0;
    let multiplyer = params.multiplyer ? params.multiplyer : 1;
    let type = params.type ? params.type : "x";
    Draggable.create(targetId, {
      type: type,
      bounds: {
        top: params.max ? params.max : 0,
        height: params.min ? params.min : 50,
        left: params.min ? params.min : 0,
        width: params.max ? params.max : 50,
      },
      onDrag: function () {
        gsap.set(thisClass.fe, {
          attr: {
            [attribute]: params.truncate
              ? Math.trunc(
                  ((type == "x" ? this.x : this.y) + offset) * multiplyer
                )
              : ((type == "x" ? this.x : this.y) + offset) * multiplyer,
          },
        });
      },
    });
  }
  createColorPicker(className) {
    let colorPicker = document.createElement("input");
    colorPicker.setAttribute("type", "color");
    colorPicker.setAttribute(
      "class",
      this.controllerId + "ColorPicker colorPicker"
    );
    $(colorPicker).addClass(className);
    colorPicker.setAttribute("value", this.color);
    let fo = createSvgElement("foreignObject");
    fo.appendChild(colorPicker);
    return fo;
  }
  initVars() {
    return null;
  }
}
//filter classes
class FilterElement extends Controller {
  constructor(id, index) {
    super(id, index);
    $(this.controller).addClass("filterElementController");
    $(this.controller).addClass("territorial");
    this.fe = this.createFe();
    this.fe.setAttributeNS(null, "result", this.id);
    this.prev = null;
    this.next = null;
    this.wires = [];
    this.drag();
  }
  drag() {
    super.dragController("." + this.controllerId, "." + this.triggerId);
  }
}

class Morphology extends FilterElement {
  constructor(id, index) {
    super(id, index);
    //FIXME: change the svgOrigin of all of these once outside the class and geti it out of here
    gsap.set(".morphologyRadius", { svgOrigin: "25 25" });
    $("." + this.controllerId).click(() => {
      this.flipOperator(this);
    });
    super.attrKnob("." + this.controllerId + "Radius", "radius", {});
  }
  createController() {
    let g = group({
      class: this.controllerId,
      id: this.controllerId,
    });
    g.appendChild(
      path({
        d: $(".morphologyDilate").attr("d"),
        class: "controllerState",
        fill: "blue",
      })
    );
    g.appendChild(
      path({
        d: $(".morphologyRadius").attr("d"),
        class: this.controllerId + "Radius morphologyRadius",
        fill: "darkgray",
      })
    );
    g.appendChild(
      path({
        d: $(".morphologyTop").attr("d"),
        class: this.triggerId,
        fill: "black",
      })
    );
    return g;
  }
  createFe() {
    return createSvgElement("feMorphology", {
      id: this.id + "Fe",
      radius: 2,
      operator: "dilate",
    });
  }
  flipOperator(thisClass) {
    //FIXME: switching between gsap and jquery is probably dumb
    let operator =
      $(this.fe).attr("operator") === "dilate" ? "erode" : "dilate";
    gsap.set(this.fe, { attr: { operator: operator } });
    gsap.to(`#${this.controllerId} .controllerState`, {
      duration: dur,
      morphSVG: `#${operator}Path`,
    });
  }
  updateRadius(rotation) {
    gsap.set(this.fe, { attr: { radius: rotation / morphRadiusRatio } });
  }
}

class GaussianBlur extends FilterElement {
  constructor(id, index) {
    super(id, index);
    //FIXME: change the svgOrigin of all of these once outside the class and geti it out of herer
    gsap.set(".controllerGaussianBlurInner", { svgOrigin: "25 25" });
    super.attrKnob(
      "." + this.controllerId + "StdDeviation",
      "stdDeviation",
      {}
    );
  }
  createController() {
    let g = group({
      class: this.controllerId,
      id: this.controllerId,
    });
    g.appendChild(
      circle({
        cx: 25,
        cy: 25,
        r: 25,
        class: `controllerGaussianBlurOuter ${this.triggerId}`,
      })
    );
    g.appendChild(
      circle({
        cx: 25,
        cy: 25,
        r: 20,
        class: `controllerGaussianBlurMiddle ${this.triggerId}`,
      })
    );
    g.appendChild(
      circle({
        cx: 25,
        cy: 13,
        r: 10,
        class: `controllerGaussianBlurInner ${this.controllerId}StdDeviation`,
      })
    );
    return g;
  }
  createFe() {
    return createSvgElement("feGaussianBlur", {
      id: this.id + "Fe",
      edgeMode: "wrap",
      stdDeviation: 5,
    });
  }
}

class DisplacementMap extends FilterElement {
  constructor(id, index) {
    super(id, index);
    super.attrKnob(`.${this.controllerId}Scale`, "scale", {
      minRotation: -1 * oneRotation,
    });
    this.channelButton("X");
    this.channelButton("Y");
  }
  initVars() {
    this.filterSpecificEnum = ["R", "G", "B", "A"];
    this.xChannelSelector = "A";
    this.yChannelSelector = "A";
  }
  createController() {
    let g = group({ id: this.controllerId, class: this.controllerId });
    let thisClass = this;
    g.appendChild(
      path({
        d: $("#displacementMapButtonX").attr("d"),
        class: `${this.controllerId}XSelector switch`,
      })
    );
    g.appendChild(
      path({
        d: $("#displacementMapButtonY").attr("d"),
        class: `${this.controllerId}YSelector switch`,
      })
    );
    g.appendChild(
      path({
        d: $("#displacementMapFixtureX").attr("d"),
        class: "fixture",
      })
    );
    g.appendChild(
      path({
        d: $("#displacementMapFixtureY").attr("d"),
        class: "fixture",
      })
    );
    g.appendChild(
      path({
        d: $("#displacementMapMain").attr("d"),
        class: `controllerDisplacementMapMain ${this.triggerId}`,
      })
    );
    function drawIndicators(axis) {
      let channel = group({ class: `${thisClass.controllerId + axis}Channel` });
      thisClass.filterSpecificEnum.forEach((c, index) => {
        let indicator = circle({
          r: 1,
          cy: axis == "X" ? 39 : index * 5 + 10,
          cx: axis == "X" ? index * 5 + 10 : 14,
          class: `${thisClass.controllerId + c} channelIndicator`,
          fill: getCssVar(`--${c}`),
        });
        if (c == thisClass.xChannelSelector)
          $(indicator).addClass("activeChannel");
        channel.appendChild(indicator);
      });
      g.appendChild(channel);
    }
    drawIndicators("X");
    drawIndicators("Y");

    let dial = use({
      href: "#genericDial",
      class: this.controllerId + "Scale",
    });
    gsap.set(dial, { svgOrigin: "25 25", x: 4, y: -4, scale: 2 });
    g.appendChild(dial);
    return g;
  }
  createFe() {
    return createSvgElement("feDisplacementMap", {
      id: this.id + "Fe",
      scale: 250,
      in: "SourceGraphic",
    });
  }
  channelButton(axis) {
    $(`.${this.controllerId + axis}Selector`).click((e) => {
      gsap.to(e.target, { duration: dur, scale: 0.5, yoyo: true, repeat: 1 });
      this.nextChannel(axis);
    });
  }
  nextChannel(axis) {
    //TODO: see if this can be done with like  Window[axis] somehow rather than echoing code
    let channel = axis == "X" ? this.xChannelSelector : this.yChannelSelector;
    channel = gsap.utils.wrap(
      this.filterSpecificEnum,
      this.filterSpecificEnum.indexOf(channel) + 1
    );
    if (axis == "X") {
      this.xChannelSelector = channel;
    } else {
      this.yChannelSelector = channel;
    }
    $(`.${this.controllerId + axis}Channel .activeChannel`).removeClass(
      "activeChannel"
    );
    $(
      `.${this.controllerId + axis}Channel .${this.controllerId + channel}`
    ).addClass("activeChannel");

    gsap.set(this.fe, {
      attr: {
        xChannelSelector: this.xChannelSelector,
        yChannelSelector: this.yChannelSelector,
      },
    });
  }
}

class Turbulence extends FilterElement {
  constructor(id, index) {
    super(id, index);
    //FIXME: move this
    gsap.set(".turbulenceTypeSwitch", { svgOrigin: "25 25" });
    $("." + this.controllerId + "TypeSwitch").click(() => {
      this.flipType(this);
    });
    super.attrSlider(`.${this.controllerId}NumOctavesTab`, "numOctaves", {
      type: "y",
      max: -5,
      multiplyer: -0.5,
      offset: -1,
      truncate: true,
    });
    super.attrSlider(`.${this.controllerId}BaseFrequencyTab`, "baseFrequency", {
      type: "y",
      max: 6,
      multiplyer: 1 / 100,
      offset: 0.001,
    });
  }
  createController() {
    let g = group({ id: this.controllerId, class: this.controllerId });
    let clipPathOctaves = createSvgElement("clipPath", {
      id: `${this.controllerId}NumOctavesClip`,
    });
    clipPathOctaves.appendChild(rect({ x: 0, y: 0, width: 50, height: 25 }));
    g.appendChild(clipPathOctaves);
    let clipPathFrequency = createSvgElement("clipPath", {
      id: `${this.controllerId}BaseFrequencyClip`,
    });
    clipPathFrequency.appendChild(rect({ x: 0, y: 25, width: 50, height: 25 }));
    g.appendChild(clipPathFrequency);
    g.appendChild(
      path({
        class: this.controllerId + "Main turbulenceMain " + this.triggerId,
        d: $("#turbulenceMain").attr("d"),
      })
    );
    g.appendChild(
      path({
        class: this.controllerId + "NumOctavesTab octaveTab",
        d: $("#turbulenceNumOctavesTab").attr("d"),
        [CLIP_PATH]: `url(#${this.controllerId}NumOctavesClip)`,
      })
    );
    g.appendChild(
      path({
        class: this.controllerId + "BaseFrequencyTab baseFrequencyTab",
        d: $("#turbulenceBaseFrequencyTab").attr("d"),
        [CLIP_PATH]: `url(#${this.controllerId}BaseFrequencyClip)`,
      })
    );
    g.appendChild(
      rect({
        class: this.controllerId + "TypeSwitch turbulenceTypeSwitch",
        x: 22,
        y: 23,
        width: 6,
        height: 4,
      })
    );
    return g;
  }
  createFe() {
    return createSvgElement("feTurbulence", {
      id: this.id + "Fe",
      stitchTile: true,
      numOctaves: 1,
      baseFrequency: 0.014,
      type: "fractalNoise",
    });
  }
  flipType(thisClass) {
    let type =
      $(this.fe).attr("type") == "turbulence" ? "fractalNoise" : "turbulence";
    $(this.fe).attr("type", type);
    gsap.to(`.${this.controllerId}TypeSwitch`, {
      duration: dur,
      rotation: "+=90",
    });
  }
}

class LightingElement extends FilterElement {
  constructor(id, index) {
    super(id, index);
    $(this.controller).addClass("lightingElement");
    $(`.${this.controllerId}ColorPicker`).change((e) => {
      this.changeColor(e.target.value);
    });
  }
  initVars() {
    this.color = randomColor();
    this.lse = null;
  }
  changeColor(color) {
    this.color = color;
    gsap.set(this.fe, { attr: { [LIGHTING_COLOR]: this.color } });
    try {
      gsap.to(`.${this.lse.controllerId} .bulb`, {
        duration: dur,
        fill: this.color,
      });
    } catch {}
  }
}

class SpecularLighting extends LightingElement {
  constructor(id, index) {
    super(id, index);
    super.attrSlider(`.${this.controllerId}Constant`, "specularConstant", {
      type: "y",
      max: 7,
      min: 40,
      multiplyer: -1 / 30,
      offset: -3.1,
    });
    super.attrSlider(`.${this.controllerId}Exponent`, "specularExponent", {
      type: "y",
      max: 7,
      min: 40,
      multiplyer: -1 / 5,
    });
    super.attrSlider(`.${this.controllerId}Scale`, "surfaceScale", {
      type: "y",
      max: 10,
      min: 37,
      multiplyer: -1,
      offset: 14,
    });
  }
  createController() {
    let g = group({
      id: this.controllerId,
      class: `${this.controllerId} specularLighting`,
    });
    g.appendChild(super.createColorPicker());
    g.appendChild(
      path({
        d: $(".specularLightingMain").attr("d"),
        class: this.triggerId + " specularLightingMain",
      })
    );
    g.appendChild(
      path({ d: $(".specularLightingSocket").attr("d"), class: "lightSocket" })
    );
    g.appendChild(
      line({
        class: this.controllerId + "ConstantBounds sliderBounds",
        x1: 30,
        y1: 46,
        x2: 30,
        y2: 7,
      })
    );
    g.appendChild(
      line({
        class: this.controllerId + "ExponentBounds sliderBounds",
        x1: 38,
        y1: 47,
        x2: 38,
        y2: 6,
      })
    );
    g.appendChild(
      line({
        class: this.controllerId + "ScaleBounds sliderBounds",
        x1: 46,
        y1: 46,
        x2: 46,
        y2: 7,
      })
    );
    g.appendChild(
      path({
        d: $(".specularLightingConstant").attr("d"),
        class: this.controllerId + "Constant slider specularConstant",
      })
    );
    g.appendChild(
      path({
        d: $(".specularLightingExponent").attr("d"),
        class: this.controllerId + "Exponent slider specularExponent",
      })
    );
    g.appendChild(
      path({
        d: $(".specularLightingScale").attr("d"),
        class: this.controllerId + "Scale slider surfaceScale",
      })
    );
    return g;
  }
  createFe() {
    return createSvgElement("feSpecularLighting", {
      id: this.id + "Fe",
      [LIGHTING_COLOR]: this.color,
      specularConstant: 1,
      specularExponent: 1,
    });
  }
  slide(slider, attribute) {
    //TODO:clean up slider starting positions so theres less offsetting the values
    let thisClass = this;
    let boundEl = $("." + slider + "Bounds")[0];
    let attrOffset = attribute == "specularConstant" ? -0.1 : -1;
    Draggable.create("." + slider, {
      type: "y",
      edgeResistance: 1,
      bounds: boundEl,
      onDrag: function (e) {
        $(thisClass.fe).attr(attribute, (this.y - 2) * attrOffset);
      },
    });
  }
}

class DiffuseLighting extends LightingElement {
  constructor(id, index) {
    super(id, index);
    this.attrSlider(`.${this.controllerId}Scale`, "surfaceScale", {
      min: 10,
      max: 30,
      offset: 3,
    });
    this.attrSlider(`.${this.controllerId}Constant`, "diffuseConstant", {
      min: 10,
      max: 30,
      offset: -1,
      multiplyer: 1 / 5,
    });
  }
  createController() {
    let g = group({
      id: this.controllerId,
      class: `${this.controllerId} diffuseLighting`,
    });
    g.appendChild(this.createColorPicker());
    g.appendChild(
      path({
        d: $("#diffuseLightingMain").attr("d"),
        class: this.triggerId + " diffuseMain",
      })
    );
    g.appendChild(
      path({ d: $("#diffuseLightingSocket").attr("d"), class: "lightSocket" })
    );
    g.appendChild(
      line({
        x1: 8,
        y1: 35,
        x2: 42,
        y2: 35,
        class: this.controllerId + "ScaleBounds sliderBounds",
      })
    );
    g.appendChild(
      line({
        x1: 8,
        y1: 44,
        x2: 42,
        y2: 44,
        class: this.controllerId + "ConstantBounds sliderBounds",
      })
    );
    g.appendChild(
      path({
        d: $("#diffuseLightingScale").attr("d"),
        class: this.controllerId + "Scale slider",
      })
    );
    g.appendChild(
      path({
        d: $("#diffuseLightingConstant").attr("d"),
        class: this.controllerId + "Constant slider",
      })
    );
    return g;
  }
  createFe() {
    return createSvgElement("feDiffuseLighting", { id: this.id + "Fe" });
  }
  slide(slider, attribute) {
    let thisClass = this;
    let boundEl = $("." + slider + "Bounds")[0];
    let attrOffset = attribute == "diffuseConstant" ? 0.1 : 1;
    Draggable.create("." + slider, {
      type: "x",
      edgeResistance: 1,
      bounds: boundEl,
      onDrag: function (e) {
        $(thisClass.fe).attr(attribute, (this.y - 2) * attrOffset);
      },
    });
  }
}

class Composite extends FilterElement {
  constructor(id, index) {
    super(id, index);
    $(this.conrtroller).addClass("in2");
    this.filterSpecificEnum = [
      "over",
      "xor",
      "atop",
      "arithmetic",
      "in",
      "out",
    ];
    $("#" + this.controllerId + "OperatorSwitch").click(() => {
      this.changeOperator();
    });
  }
  createController() {
    let g = group({
      id: this.controllerId,
      class: this.controllerId + " composite",
    });
    g.appendChild(circle({ r: 20, cx: 25, cy: 25, class: this.triggerId }));
    let operatorSwitch = group({
      id: this.controllerId + "OperatorSwitch",
      class: this.controllerId + "OperatorSwitch",
    });
    operatorSwitch.appendChild(
      circle({ r: 12, cx: 25, cy: 25, class: this.triggerId, stroke: "black" })
    );
    operatorSwitch.appendChild(
      path({
        d: $("#out").attr("d"),
        class: this.controllerId + "Operator",
      })
    );
    g.appendChild(operatorSwitch);
    return g;
  }
  createFe() {
    return createSvgElement("feComposite", {
      operator: "out",
      k1: 100,
      k2: 1,
      k3: 1,
      k4: 0,
      in: "SourceGraphic",
    });
  }
  changeOperator() {
    let operator = nextArrayElement(
      this.filterSpecificEnum,
      this.fe.getAttributeNS(null, "operator")
    );
    gsap.to("." + this.controllerId + "Operator", {
      duration: dur,
      morphSVG: `#${operator}`,
    });
    gsap.set(this.fe, { attr: { operator: operator } });
  }
}

class Blend extends FilterElement {
  constructor(id, index) {
    super(id, index);
    this.filterSpecificEnum = [
      "normal",
      "screen",
      "multiply",
      "lighten",
      "darken",
      "luminosity",
      "overlay",
      "color-dodge",
      "color-burn",
      "hard-light",
      "soft-light",
      "difference",
      "exclusion",
      "hue",
      "saturation",
      "color",
    ];
    $("." + this.controllerId).click(() => {
      gsap.to(this.controller, { duration: dur, rotation: "+=22.5" });
      this.changeMode(this);
    });
  }
  createController() {
    let g = group({ id: this.controllerId, class: this.controllerId });
    gsap.set(g, { svgOrigin: "25 25" });
    g.appendChild(
      circle({ class: `${this.triggerId} blend`, r: 15, cx: 25, cy: 25 })
    );
    return g;
  }
  createFe() {
    return createSvgElement("feBlend", {
      id: this.id + "Fe",
      in: "SourceGraphic",
    });
  }
  changeMode() {
    let mode = nextArrayElement(
      this.filterSpecificEnum,
      this.fe.getAttributeNS(null, "mode")
    );
    gsap.set(this.fe, { attr: { mode: mode } });
  }
}

class Offset extends FilterElement {
  constructor(id, index) {
    super(id, index);
    this.dragOffset(this.controllerId + "Offset");
  }
  createController() {
    let g = group({ id: this.controllerId, class: this.controllerId });
    g.appendChild(
      rect({
        x: 2,
        y: 2,
        width: 46,
        height: 46,
        rx: 5,
        ry: 5,
        class: this.controllerId + "OffsetBounds " + this.triggerId,
        fill: "white",
      })
    );
    let offsetG = group({ class: this.controllerId + "Offset" });
    offsetG.appendChild(
      rect({
        x: 12,
        y: 12,
        width: 26,
        height: 26,

        fill: "gray",
      })
    );
    offsetG.appendChild(use({ href: "#out" }));
    g.appendChild(offsetG);
    let useOut = use({ href: "#out" });
    gsap.set(useOut, { svgOrigin: "25 25", rotate: 45, scale: 1.5 });

    g.appendChild(useOut);
    return g;
  }
  createFe() {
    return createSvgElement("feOffset", { id: this.id + "Fe" });
  }
  dragOffset(targetId) {
    let thisClass = this;
    Draggable.create("." + targetId, {
      type: "x,y",
      edgeResistance: 1,
      bounds: $("." + targetId + "Bounds")[0],
      onDrag: function () {
        gsap.set(thisClass.fe, {
          attr: { dx: "+=" + this.x, dy: "+=" + this.y },
        });
      },
      onDragEnd: function () {
        gsap.to("." + targetId, { duration: dur, x: 0, y: 0 });
      },
    });
  }
}

class ColorMatrix extends FilterElement {
  constructor(id, index) {
    super(id, index);
    this.filterSpecificEnum = [
      "matrix",
      "saturate",
      "hueRotate",
      "luminanceToAlpha",
    ];
    $(`.${this.controllerId}MatrixValue`).click((e) => {
      this.toggleValue(e, this);
    });
    $(`.${this.controllerId}TypeSwitch`).click(() => {
      this.changeType();
    });
  }
  initVars() {
    this.matrix = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0];
  }
  createController() {
    let g = group({ id: this.controllerId, class: this.controllerId });
    g.appendChild(
      path({
        d: $("#colorMatrixRear").attr("d"),
        class: `${this.triggerId} panelRear`,
      })
    );
    g.appendChild(
      path({
        class: this.triggerId + " matrixPanel",
        d: $("#colorMatrixMain").attr("d"),
      })
    );
    this.matrix.forEach((v, index) => {
      g.appendChild(
        circle({
          r: 3,
          cx: ((index % 5) + 1.1) * 8,
          cy: (index / 5 + 1.7) * 8,
          class: `${!!v} ${this.controllerId}MatrixValue`,
        })
      );
    });
    g.appendChild(
      path({
        class: this.controllerId + "TypeSwitch switch",
        d: $("#colorMatrixSwitch").attr("d"),
      })
    );
    let dial = use({
      class: this.controllerId + "ValueDial",
      href: "#genericDial",
    });
    gsap.set(dial, { svgOrigin: "25 25", x: 14, y: -16, scale: 0.8 });
    g.appendChild(dial);
    return g;
  }
  createFe() {
    return createSvgElement("feColorMatrix", {
      id: this.id + "Fe",
      type: "matrix",
      values: this.matrix,
    });
  }
  toggleValue(e, thisClass) {
    let target = $(e.target);
    let oldVal = target.hasClass("true");
    let i = $(`.${thisClass.controllerId}MatrixValue`).index(target);
    target.removeClass(oldVal.toString());
    target.addClass((!oldVal).toString());
    if ($(thisClass.fe).attr("type") == "matrix") {
      thisClass.matrix[i] = oldVal ? 0 : 1;
      thisClass.updateMatrixFe();
    }
  }
  updateMatrixValues() {
    $(`.${this.controllerId}MatrixValue`).each((index, el) => {
      this.matrix[index] = $(el).hasClass("true") ? 1 : 0;
    });
    this.updateMatrixFe();
  }
  updateMatrixFe() {
    $(this.fe).attr("values", this.matrix);
  }
  changeType() {
    let type = nextArrayElement(
      this.filterSpecificEnum,
      this.fe.getAttributeNS(null, "type")
    );
    switch (type) {
      case "matrix":
        super.attrKnob($(`.${this.controllerId}ValueDial`), null, {});
        this.updateMatrixValues();
        break;
      // TODO: maybe these shouldnt be hardcoded values, instead remeber the old value and use it again?
      case "saturate":
        gsap.set(this.fe, { attr: { values: 1 } });
        super.attrKnob($(`.${this.controllerId}ValueDial`), "values", {
          multiplyer: 1 / 360,
          minRotation: -5 * oneRotation,
          maxRotation: 5 * oneRotation,
        });
        break;
      case "hueRotate":
        gsap.set(this.fe, { attr: { values: 90 } });
        super.attrKnob($(`.${this.controllerId}ValueDial`), "values", {
          minRotation: "none",
          maxRotation: "none",
        });
        break;
      default:
        gsap.set(this.fe, { attr: { values: null } });
        super.attrKnob($(`.${this.controllerId}ValueDial`), null, {});
    }
    gsap.set(this.fe, { attr: { type: type } });
  }
}

class Flood extends FilterElement {
  constructor(id, index) {
    super(id, index);
    $(`.${this.controllerId}ColorPicker`).change((e) => {
      gsap.set(this.fe, { attr: { [FLOOD_COLOR]: e.target.value } });
    });
    super.attrKnob(`.${this.controllerId}Opacity`, FLOOD_OPACITY, {
      multiplyer: 1 / 360,
    });
  }
  initVars() {
    this.color = randomColor();
  }
  createController() {
    let g = group({
      id: this.controllerId,
      class: `${this.controllerId} flood`,
    });
    g.appendChild(this.createColorPicker());
    g.appendChild(
      path({
        d: $("#floodMain").attr("d"),
        class: `${this.triggerId} floodMain`,
      })
    );
    let useDial = use({
      href: "#genericDial",
      class: this.controllerId + "Opacity",
    });
    gsap.set(useDial, { svgOrigin: "25 25", y: 8, scale: 1.5 });
    g.appendChild(useDial);
    return g;
  }
  createFe() {
    return createSvgElement("feFlood", {
      id: this.id + "Fe",
      [FLOOD_COLOR]: this.color,
      [FLOOD_OPACITY]: 0.5,
    });
  }
}

class ComponentTransfer extends FilterElement {
  constructor(id, index) {
    super(id, index);
  }
  createController() {
    let g = group({ id: this.controllerId, class: this.controllerId });
    let dialW = 5;

    let clipPath = createSvgElement("clipPath", {
      id: `${this.controllerId}ClipPath`,
    });
    clipPath.appendChild(rect({ y: 5, width: 50, height: 40, rx: 5, ry: 5 }));
    g.appendChild(clipPath);

    this.compArr.forEach((c, row) => {
      let func = group({
        class: this.controllerId + "Func" + c.name,
      });
      func.appendChild(
        rect({
          height: "10px",
          width: "50px",
          class: "func func" + c.name + " " + this.triggerId,
          y: row * 10 + 5,
          [CLIP_PATH]: `url(#${this.controllerId}ClipPath)`,
        })
      );
      let typeSwitch = rect({
        x: 4,
        y: dialW * 2 * row + 7,
        width: dialW,
        height: dialW,
        fill: "orange",
      });
      $(typeSwitch).click(() => {
        this.changeType(row);
      });
      func.appendChild(typeSwitch);
      this.attrArr.forEach((a, col) => {
        // todo: the fuck is up with this?
        let idString = this.controllerId + "Row" + row + "Col" + col;
        let attrKnob = use({
          href: "#genericDial",
          class: idString + " funcButton",
        });
        gsap.set(attrKnob, {
          svgOrigin: "25 25",
          scale: 0.6,
          x: dialW * 1.5 * col - 9,
          y: dialW * 2 * row - 15,
        });

        this.sharedKnob(attrKnob, row, this.attrArr[col], col);
        func.appendChild(attrKnob);
      });
      g.appendChild(func);
    });
    return g;
  }
  createFe() {
    let compTrans = createSvgElement("feComponentTransfer", {
      id: this.id + "Fe",
    });
    this.compArr.forEach((c) => {
      compTrans.appendChild(
        createSvgElement("feFunc" + c.name, {
          class: this.id + "FeFunc",
          type: "identity",
          tableValues: "1 1 0 0",
          slope: 0.5,
          intercept: 0.25,
          amplitude: 4,
          exponent: 4,
          offset: 0,
        })
      );
    });
    return compTrans;
  }
  initVars() {
    this.filterSpecificEnum = [
      "identity",
      "table",
      "discrete",
      "linear",
      "gamma",
    ];
    this.compArr = [
      { name: "R", typeIndex: 0, tableValues: [1, 1, 0, 0] },
      { name: "G", typeIndex: 0, tableValues: [1, 1, 0, 0] },
      { name: "B", typeIndex: 0, tableValues: [1, 1, 0, 0] },
      { name: "A", typeIndex: 0, tableValues: [1, 1, 0, 0] },
    ];
    this.attrArr = ["slope", "intercept", "amplitude", "exponent", "offset"];
  }
  changeType(compIndex) {
    gsap.set(this.fe.childNodes[compIndex], {
      attr: { type: this.nextComponent(compIndex) },
    });
  }
  nextComponent(compIndex) {
    return gsap.utils.wrap(
      this.filterSpecificEnum,
      ++this.compArr[compIndex].typeIndex
    );
  }
  //this is a great example of high coupling, low cohesion; the exact opposite of ideal
  sharedKnob(targetEl, funcIndex, attribute, tableValueIndex) {
    let thisClass = this;
    Draggable.create(targetEl, {
      type: "rotation",
      bounds: { minRotation: 0, maxRotation: oneRotation },
      onDrag: function () {
        let thisTableValues = thisClass.compArr[funcIndex].tableValues;
        thisTableValues[tableValueIndex] = this.rotation / 360;
        gsap.set(thisClass.fe.childNodes[funcIndex], {
          //TODO: you need differnt multiplyers for different attributes. exponent/amplitude shoud go to 10, slope/intercept/offest 0-1?????
          attr: {
            [attribute]: this.rotation / 36,
            tableValues: thisTableValues,
          },
        });
      },
    });
  }
}

class ConvolveMatrix extends FilterElement {}

class Image extends FilterElement {
  constructor(id, index) {
    super(id, index);
    $(this.controller).click(() => {
      this.nextImage();
    });
  }
  createController() {
    let g = group({ id: this.controllerId, class: this.controllerId });
    g.appendChild(
      rect({
        class: `${this.triggerId} imageRear`,
        x: 5,
        y: 5,
        width: 40,
        height: 40,
        rx: 5,
        ry: 5,
      })
    );
    g.appendChild(
      circle({ r: 5, cx: 35, cy: 15, class: `${this.triggerId} imageMain` })
    );
    g.appendChild(
      polyline({
        class: `${this.triggerId} imageMain`,
        points: "10,40 20,20 30,35, 33,30 40,40",
      })
    );
    return g;
  }
  createFe() {
    return createSvgElement("feImage", {
      id: this.id + "Fe",
      href: imageArr[0],
    });
  }
  initVars() {
    this.filterSpecificEnum = imageArr;
  }
  nextImage() {
    gsap.set(this.fe, {
      attr: {
        href: nextArrayElement(
          this.filterSpecificEnum,
          this.fe.getAttributeNS(null, "href")
        ),
      },
    });
  }
}

class Tile extends FilterElement {
  constructor(id, index) {
    super(id, index);
  }
  createController() {
    let g = group({ id: this.controllerId, class: this.controllerId });
    g.appendChild(
      rect({
        class: this.triggerId,
        fill: "blue",
        x: 5,
        y: 5,
        width: 40,
        height: 40,
      })
    );
    return g;
  }
  createFe() {
    return createSvgElement("feTile", {
      x: 50,
      y: 50,
      width: 100,
      height: 100,
    });
  }
}

class Merge extends FilterElement {}
//end of filter classes

//sub filters - light source elements (lse)
class LightSourceElement extends Controller {
  constructor(id, index) {
    super(id, index);
    this.fe = this.createFe();
    this.drag();
  }
  dragLse(targetId, triggerId) {
    let thisClass = this;
    let validHit = false;
    Draggable.create(targetId, {
      type: "x,y",
      edgeResistance: 0.9,
      trigger: triggerId,
      bounds: grid,
      inertia: true,
      onDragEnd: function (e) {
        let lightingElements = $(".lightingElement");
        let i = lightingElements.length;
        while (--i > -1) {
          let le = lightingElements[i];
          if (this.hitTest(le) && !$(le).data("class").lse) {
            thisClass.dropIntoLightSocket(this.target, le);
            validHit = true;
          }
        }
        if (!validHit) {
          thisClass.resetLse();
        }
      },
    });
  }
  drag() {
    this.dragLse("." + this.controllerId, "." + this.triggerId);
  }
  //this empty function exists for the benefit of elements that have attributes affected by dragged controller switches and stuff, this one is for all the others that have none
  attrDrag() {
    return true;
  }
  dropIntoLightSocket(lse, lightElement) {
    let lseClass = $(lse).data("class");
    let lightElementClass = $(lightElement).data("class");
    $(lse).addClass(lightElementClass.controllerId);
    lightElementClass.drag();
    lseClass.attrDrag();
    lightElementClass.lse = lseClass;
    //this probably wont work
    $(lightElementClass.fe).html();
    lightElementClass.fe.appendChild(lseClass.fe);
    gsap.to(`.${lseClass.controllerId} .bulb`, {
      duration: dur,
      fill: lightElementClass.color,
    });
    updateAllFilters();
  }
  resetLse() {
    this.fe.remove();
    this.drag();
    setTimeout(() => {
      gsap.to(this.controller, {
        duration: dur * 2,
        x: controllerArr[this.controllerArrayIndex].initX * gridWidth,
        y: controllerArr[this.controllerArrayIndex].initY * gridHeight,
      });
    }, timeout);
  }
}

class PointLight extends LightSourceElement {
  constructor(id, index) {
    super(id, index);
  }
  createController() {
    let g = group({ id: this.controllerId, class: this.controllerId });
    g.appendChild(
      path({
        d: $("#bulbThreads").attr("d"),
        class: "bulbThreads",
      })
    );
    g.appendChild(path({ d: $("#bulbNeck").attr("d"), class: "bulbNeck" }));
    g.appendChild(
      path({ d: $("#pointBulb").attr("d"), class: this.triggerId + " bulb" })
    );
    return g;
  }
  createFe() {
    // TODO: Move default values
    return createSvgElement("fePointLight", {
      id: this.id + "Fe",
      x: 50,
      y: 50,
      z: 220,
    });
  }
}

class DistantLight extends LightSourceElement {
  constructor(id, index) {
    super(id, index);
    gsap.set(".distantElevation", { svgOrigin: "5 5" });
    gsap.set(".distantAzimuth", { svgOrigin: "12 22" });
    this.attrDrag();
  }
  createController() {
    let g = group({ id: this.controllerId, class: this.controllerId });
    g.appendChild(
      path({
        d: $("#bulbThreads").attr("d"),
        class: "bulbThreads",
      })
    );
    g.appendChild(path({ d: $("#bulbNeck").attr("d"), class: "bulbNeck" }));
    g.appendChild(
      path({
        d: $("#distantBulbAzimuth").attr("d"),
        class: this.controllerId + "Azimuth distantAzimuth",
      })
    );
    g.appendChild(
      path({ d: $("#distantBulb").attr("d"), class: this.triggerId + " bulb" })
    );
    g.appendChild(
      path({
        d: $("#distantBulbElevation").attr("d"),
        class: this.controllerId + "Elevation distantElevation",
      })
    );
    return g;
  }
  createFe() {
    return createSvgElement("feDistantLight", { id: this.id + "Fe" });
  }
  attrDrag() {
    super.attrKnob("." + this.controllerId + "Azimuth", "azimuth", {
      minRotation: "none",
      maxRotation: "none",
    });
    super.attrKnob("." + this.controllerId + "Elevation", "elevation", {
      minRotation: "none",
      maxRotation: "none",
    });
  }
}

class SpotLight extends LightSourceElement {
  constructor(id, index) {
    super(id, index);
  }
  createController() {
    let g = group({ id: this.controllerId, class: this.controllerId });
    g.appendChild(
      path({ d: $("#bulbThreads").attr("d"), class: "bulbThreads" })
    );
    g.appendChild(path({ d: $("#bulbNeck").attr("d"), class: "bulbNeck" }));
    g.appendChild(
      path({ d: $("#spotBulbRear").attr("d"), class: "spotBulbRear" })
    );
    g.appendChild(
      path({ d: $("#spotBulbAngle").attr("d"), class: "spotBulbAngle bulb" })
    );
    g.appendChild(
      path({
        d: $("#spotBulbMain").attr("d"),
        class: this.triggerId + " spotBulbMain",
      })
    );
    g.appendChild(
      path({ d: $("#spotBulbReflector").attr("d"), class: "spotBulbReflector" })
    );
    return g;
  }
  createFe() {
    return createSvgElement("feSpotLight", {
      id: this.id + "Fe",
      x: -10,
      y: 10,
      z: 50,
      pointsAtX: 100,
      pointsAtY: 100,
      specularExponent: 5,
      limitingConeAngle: 30,
    });
  }
}

//end of light source elements

class Connector extends Controller {
  constructor(id, index) {
    super(id, index);
    this.dragConnector();
    this.input = null;
    this.output = null;
    $(`#${this.controllerId}Line`).click(() => {
      this.resetConnector();
    });
  }

  initController(group, xPos, yPos) {
    $(group).data("class", this);
    gsap.set(group, { x: gridWidth * xPos, y: gridHeight * yPos });
    $("#connectorLayer")[0].appendChild(group);
  }

  createController() {
    this.maleClasses = this.controllerId + "Head male connector";
    this.femaleClasses = this.controllerId + "Head female connector";
    let g = group();
    g.appendChild(
      path({
        id: this.controllerId + "Male",
        class: this.maleClasses,
        fill: "lightblue",
        d: $("#connectorMale").attr("d"),
      })
    );
    wireLayer.appendChild(
      polyline({
        id: this.controllerId + "Line",
        points: "25,25 25,25 25,25 25,25",
        strokeWidth: 5,
        stroke: "black",
        class: "wire",
      })
    );
    g.appendChild(
      path({
        id: this.controllerId + "Female",
        class: this.femaleClasses,
        fill: "magenta",
        d: $("#connectorFemale").attr("d"),
      })
    );
    return g;
  }

  dragConnector() {
    let thisClass = this;
    Draggable.create("." + thisClass.controllerId + "Head", {
      type: "x,y",
      edgeResistance: 0.9,
      bounds: grid,
      inertia: true,
      snap: {
        x: function (endValue) {
          return Math.round(endValue / gridWidth) * gridWidth;
        },
        y: function (endValue) {
          return Math.round(endValue / gridHeight) * gridHeight;
        },
      },
      onDragEnd: function (e) {
        let feControllersAndSockets = $(".filterElementController").add(
          $(".filterSocket")
        );
        let i = feControllersAndSockets.length;
        while (--i > -1) {
          if (this.hitTest(feControllersAndSockets[i])) {
            thisClass.connectFilterElement(
              this.target,
              feControllersAndSockets[i]
            );
          }
        }
      },
    });
  }

  connectFilterElement(connector, filterElement) {
    let feClass = $(filterElement).data("class");
    let female = $(connector).hasClass("female");
    if (
      (female && (feClass.next || $(filterElement).hasClass("filterSocket"))) ||
      (!female && (feClass.prev || !this.input || this.input == feClass))
    ) {
      this.resetConnector();
    } else {
      if (female) {
        this.input = feClass;
      } else {
        feClass.prev = this.input;
        this.input.next = feClass;
        if ($(filterElement).hasClass("in2")) {
          gsap.set(feClass.fe, { attr: { in2: $(this.input).attr("id") } });
        }
        this.output = feClass;
      }
      $(connector).addClass(feClass.controllerId);
      feClass.drag();
      // FIXME: this should maybe just update the relevant filter?
      updateAllFilters();
      this.reDrawPolyline();
    }
  }

  resetConnector() {
    let gChildren = this.controller.childNodes;
    try {
      this.input.next = null;
    } catch {}
    try {
      this.output.prev = null;
    } catch {}
    $("#" + this.controllerId + "Female").attr("class", this.femaleClasses);
    $("#" + this.controllerId + "Male").attr("class", this.maleClasses);
    this.dragConnector();
    this.input = null;
    this.output = null;
    //FIXME: this is probably not the right place for this function
    updateAllFilters();

    setTimeout(function () {
      gChildren.forEach((child) => {
        gsap.to(child, {
          duration: dur,
          x: 0,
          y: 0,
          attr: { points: "25,25 25,25 25,25 25,25" },
        });
      });
    }, timeout);
  }

  reDrawPolyline() {
    let female = document.getElementById(`${this.controllerId}Female`);
    let male = document.getElementById(`${this.controllerId}Male`);
    let cxf = Math.trunc(getCenterX(female));
    let cyf = Math.trunc(getCenterY(female));
    let cxm = Math.trunc(getCenterX(male));
    let cym = Math.trunc(getCenterY(male));
    let x2 = (cxm + cxf) / 2;
    let points = `${cxf},${cyf} ${x2},${cyf} ${x2},${cym} ${cxm},${cym}`;
    gsap.to(`#${this.controllerId}Line`, { attr: { points: points } });
  }
}

class FilterSocket extends Controller {
  constructor(id, index) {
    super(id, index);
    $(this.controller).addClass("territorial");
    this.counter = this.id.slice(12);
    this.filter = this.createFilter();
    this.prev = null;
    filterDefs.appendChild(this.filter);
  }
  createController() {
    let g = group({
      id: this.controllerId,
      class: this.controllerId + " filterSocket",
    });
    g.appendChild(rect({ class: "socket", width: 50, height: 50 }));
    return g;
  }
  createFilter() {
    let filter = createSvgElement("filter", {
      id: `filter${this.counter}`,
      x: "-300%",
      width: "700%",
    });
    filter.append(createSvgElement("feOffset"));
    return filter;
  }
  updateFilter() {
    this.filter.innerHTML = "<feOffset/>";
    let currentFilterElement = this;
    let fes = [];
    while (currentFilterElement.prev) {
      currentFilterElement = currentFilterElement.prev;
      if (fes.indexOf(currentFilterElement.fe) != -1) {
        currentFilterElement.prev = null;
      } else {
        let fe = currentFilterElement.fe;
        fes.push(fe);
        fe.remove();
        $(this.filter).prepend(fe);
      }
    }
  }
  drag() {
    return false;
  }
}
//end of controllers

initializeGrid = function () {
  for (i = 0; i < gridRows * gridColumns; i++) {
    y = Math.floor(i / gridColumns) * gridHeight;
    x = (i * gridWidth) % (gridColumns * gridWidth);
    row = Math.floor(i / gridColumns);
    col = i % gridColumns;
    $("#gridLayer")[0].appendChild(
      rect({
        x: x,
        y: y,
        fill: "gray",
        opacity: 0.3,
        width: gridWidth - 1,
        height: gridHeight - 1,
        class: `row${row} col${col} empty`,
      })
    );
  }
};
initializeGrid();

updateAllFilters = function () {
  Array.from(document.getElementsByClassName("filterSocket")).forEach((s) => {
    $(s).data("class").updateFilter();
  });
};

let controllerArr = [
  {
    name: "FilterSocket",
    constructor: FilterSocket,
    counter: 0,
    initX: 11,
    initY: 3,
  },
  {
    name: "Connector",
    constructor: Connector,
    counter: 0,
    initX: 1,
    initY: 0,
  },
  {
    name: "Morphology",
    constructor: Morphology,
    counter: 0,
    initX: 0,
    initY: 0,
  },
  {
    name: "GaussianBlur",
    constructor: GaussianBlur,
    counter: 0,
    initX: 0,
    initY: 1,
  },
  {
    name: "DisplacementMap",
    constructor: DisplacementMap,
    counter: 0,
    initX: 0,
    initY: 2,
  },
  {
    name: "Turbulence",
    constructor: Turbulence,
    counter: 0,
    initX: 0,
    initY: 3,
  },
  {
    name: "SpecularLighting",
    constructor: SpecularLighting,
    counter: 0,
    initX: 0,
    initY: 4,
  },
  {
    name: "DiffuseLighting",
    constructor: DiffuseLighting,
    counter: 0,
    initX: 0,
    initY: 5,
  },
  { name: "Composite", constructor: Composite, counter: 0, initX: 0, initY: 6 },
  { name: "Blend", constructor: Blend, counter: 0, initX: 1, initY: 1 },
  { name: "Offset", constructor: Offset, counter: 0, initX: 1, initY: 2 },
  {
    name: "ColorMatrix",
    constructor: ColorMatrix,
    counter: 0,
    initX: 1,
    initY: 3,
  },
  { name: "Flood", constructor: Flood, counter: 0, initX: 1, initY: 4 },
  {
    name: "ComponentTransfer",
    constructor: ComponentTransfer,
    counter: 0,
    initX: 1,
    initY: 5,
  },
  { name: "Image", constructor: Image, counter: 0, initX: 1, initY: 6 },
  { name: "Tile", constructor: Tile, counter: 0, initX: 2, initY: 0 },
  {
    name: "PointLight",
    constructor: PointLight,
    counter: 0,
    initX: 2,
    initY: 1,
  },
  {
    name: "DistantLight",
    constructor: DistantLight,
    counter: 0,
    initX: 2,
    initY: 2,
  },
  { name: "SpotLight", constructor: SpotLight, counter: 0, initX: 2, initY: 3 },
];

generateController = function (controllerKey) {
  let c = controllerArr[controllerKey];
  let newFilterElement = new c.constructor(c.name + c.counter++, controllerKey);
};

generateAllControllers = function () {
  controllerArr.forEach(
    (c, index) => new c.constructor(c.name + c.counter++, index)
  );
};

generateNewControllerButtons = function () {
  let buttonLayer = document.getElementById("newControllerButtonLayer");
  controllerArr.forEach((c, index) => {
    let newButton = circle({
      class: "newControllerButton",
      id: `new${c.name}Button`,
      r: 10,
      cx: 25,
      cy: 25,
      fill: "white",
    });
    $(newButton).click(() => {
      generateController(index);
    });
    buttonLayer.appendChild(newButton);
    gsap.set(newButton, { x: c.initX * gridWidth, y: c.initY * gridHeight });
  });
};
generateNewControllerButtons();

//get the temp function calls out of here
importExternalSvg = function () {
  $("#controllerMorphologyContainer").load(
    "/assets/controllers/controllerMorphology.svg"
  );
  $("#controllerDisplacementMapContainer").load(
    "/assets/controllers/controllerDisplacementMap.svg"
  );
  $("#controllerTurbulenceContainer").load(
    "/assets/controllers/controllerTurbulence.svg"
  );
  $("#controllerSpecularLightingContainer").load(
    "/assets/controllers/controllerSpecularLighting.svg"
  );
  $("#controllerDiffuseLightingContainer").load(
    "/assets/controllers/controllerDiffuseLighting.svg"
  );
  $("#controllerColorMatrixContainer").load(
    "/assets/controllers/controllerColorMatrix.svg"
  );
  $("#controllerFloodContainer").load(
    "/assets/controllers/controllerFlood.svg"
  );

  $("#connectorContainer").load("/assets/controllers/connector.svg");
  $("#compositeOperatorContainer").load(
    "/assets/controllers/compositeOperatorPaths.svg"
  );
  $("#bulbsContainer").load("/assets/controllers/bulbs.svg");
  $("#canvasLayer").load("/assets/skull.svg", () => {
    generateAllControllers();
  });
};
importExternalSvg();
