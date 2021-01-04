let ns = {
  svg: "http://www.w3.org/2000/svg",
  xlink: "http://www.w3.org/1999/xlink",
  html: "http://www.w3.org/1999/xhtml",
};

//create svg elements
createSvgElement = function (element, params) {
  let e = document.createElementNS(ns.svg, element);
  if (!params) return e;
  Object.entries(params).forEach((p) => {
    const [attribute, value] = p;
    e.setAttributeNS(null, attribute, value);
  });
  return e;
};

//shortcuts for common elements
defs = function (params) {
  return createSvgElement("defs", params);
};

title = function(text, params){
  let title = createSvgElement("title", params);
  title.textContent = text;
  return title;
}

group = function (params) {
  return createSvgElement("g", params);
};

path = function (params) {
  return createSvgElement("path", params);
};

use = function (params) {
  return createSvgElement("use", params);
};

rect = function (params) {
  return createSvgElement("rect", params);
};

circle = function (params) {
  return createSvgElement("circle", params);
};

line = function (params) {
  return createSvgElement("line", params);
};

polyline = function (params) {
  return createSvgElement("polyline", params);
};

//filter stuff
//filterElement
// filterElement = function () {
//   let filterElement = createSvgElement(fe.name, fe.params);
//   fe.subElements.forEach((sFe) => {
//     filterElement(sFe.name, sFe.params);
//   });
//   filter.appendChild(filterElement);
// };

// filter = function (params) {
//   // {filterParams[id, filterUnits, etc], filterElements[{name, params, subElements(for like merge and specular lighting and shit)}]}
//   let filter = createSvgElement("filter", params.filterParams);
//   params.filterElements.forEach((fe) => {
//     filterElements(fe.name, fe.params, fe.subElements);
//   });
//   return filter;
// };

getCenterX = function (el) {
  let bBox = el.getBoundingClientRect();
  return (bBox.x + bBox.width) / 2;
};

getCenterY = function (el) {
  let bBox = el.getBoundingClientRect();
  return (bBox.y + bBox.height) / 2;
};

//centers an element around point 0,0
//TODO: test this
centerElement = function (element) {
  let bBox = element.getBBox();
  element.style.transform = `translate(-${bBox.width / 2 + bBox.x}px, -${
    bBox.height / 2 + bBox.y
  }px)`;
};

//creates or uses existing defs to give element a coordiante system
//FIXME:this may need to change if multiple defs in different svgs with different viewports)
addToDefs = function (elem) {
  if (!document.getElementsByTagName("defs")[0]) {
    document.getElementsByTagName("svg")[0].appendChild(defs());
  }
  document.getElementsByTagName("defs")[0].appendChild(elem);
};
