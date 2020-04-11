import EventEmitter from 'tiny-emitter';
import { drawRect, rectArea } from './RectFragment';
import { SVG_NAMESPACE } from '../SVGConst';
import EditableRect from '../selection/EditableRect';
import RubberbandRectSelector from '../selection/RubberbandRectSelector';

export default class AnnotationLayer extends EventEmitter {

  constructor(wrapperEl) {
    super();

    this.svg = document.createElementNS(SVG_NAMESPACE, 'svg');
    this.svg.classList.add('a9s-annotationlayer');

    wrapperEl.appendChild(this.svg);

    this.enableDrawing();
    // this.svg.addEventListener('mousedown', this.onMouseDown);

    // TODO make switchable in the future
    const selector = new RubberbandRectSelector(this.svg);
    selector.on('complete', this.onDrawingComplete);
    selector.on('cancel', this.onDrawingCanceled);

    this.currentTool = selector;
    this.currentHover = null;
  }

  enableDrawing = () =>
    this.svg.addEventListener('mousedown', this.onMouseDown);

  disableDrawing = () =>
    this.svg.removeEventListener('mousedown', this.onMouseDown);

  onMouseDown = evt =>
    this.currentTool.startDrawing(evt);

  onDrawingComplete = evt =>
    this.emit('select', evt);

  onDrawingCanceled = () => {
    if (this.currentHover)
      this.selectShape(this.currentHover);
  }

  selectShape = shape => {
    this.emit('select', { 
      selection: shape.annotation,
      bounds: shape.getBoundingClientRect()
    });

    const editableShape = new EditableRect(shape.annotation, this.svg);
    this.disableDrawing();
    this.removeAnnotation(shape.annotation);

    // TODO remove original shape
  }

  addAnnotation = annotation => {
    const g = drawRect(annotation);  
    g.setAttribute('class', 'a9s-annotation');
    g.setAttribute('data-id', annotation.id);
    g.annotation = annotation;
  
    this.svg.appendChild(g);
 
    g.addEventListener('mouseenter', evt => {
      if (this.currentHover !== g)
        this.emit('mouseEnterAnnotation', annotation, evt);
        
      this.currentHover = g;
    });

    g.addEventListener('mouseleave', evt => {
      if (this.currentHover === g) 
        this.emit('mouseLeaveAnnotation', annotation, evt);

      this.currentHover = null;
    });

    return g;
  }

  findShape = annotationOrId => {
    const id = annotationOrId.id ? annotationOrId.id : annotationOrId;
    return this.svg.querySelector(`.a9s-annotation[data-id="${id}"]`);
  }
      /**
   * Redraws the whole layer with annotations sorted by
   * size, so that larger ones don't occlude smaller ones.
   */
  redraw = () => {
    const shapes = Array.from(this.svg.querySelectorAll('.a9s-annotation'));
    const annotations = shapes.map(s => s.annotation);
    annotations.sort((a, b) => rectArea(b) - rectArea(a));

    // Clear the SVG element
    shapes.forEach(s => this.svg.removeChild(s));

    // Redraw
    annotations.forEach(this.addAnnotation);
  }

  clearSelection = () =>
    this.currentTool.clear();

  /****************/               
  /* External API */
  /****************/    

  init = annotations => {
    // Sort annotations by size
    annotations.sort((a, b) => rectArea(b) - rectArea(a));
    annotations.forEach(this.addAnnotation);
  }

  addOrUpdateAnnotation = (annotation, previous) => {
    if (previous)
      this.removeAnnotation(annotation);

    this.addAnnotation(annotation);

    // Make sure rendering order is large-to-small
    this.redraw();
  }

  removeAnnotation = annotation => {
    const shape = this.findShape(annotation);
    if (shape)
      shape.parentNode.removeChild(shape);
  }

  getAnnotations = () => {
    const shapes = Array.from(this.svg.querySelectorAll('.a9s-annotation'));
    return shapes.map(s => s.annotation);
  }

  setAnnotationsVisible = visible => {
    if (visible)
      this.svg.style.display = null;
    else
      this.svg.style.display = 'none';
  }

  selectAnnotation = annotationOrId => {
    const selected = this.findShape(annotationOrId);
    if (selected)
      this.selectShape(selected);
  }

  destroy = () => {
    this.currentTool = null;
    this.currentHover = null;
    this.svg.parentNode.removeChild(this.svg);
  }

}