import React, { Component, cloneElement, Children, CSSProperties } from 'react';
import classnames from 'classnames';
import PropsType from './PropsType';
import Events from '../utils/events';
import Drag from '../drag';

export interface CarouselProps extends PropsType {
  prefixCls?: string;
  className?: string;
}

export default class Carousel extends Component<CarouselProps, any> {
  static defaultProps = {
    prefixCls: 'za-carousel',
    direction: 'left',
    height: 160,
    loop: false,
    activeIndex: 0,
    animationDuration: 300,
    autoPlay: false,
    autoPlayIntervalTime: 3000,
    moveDistanceRatio: 0.5,
    moveTimeSpan: 300,
    showPagination: true,
  };

  private carouselItems;
  private moveInterval;
  private translateX: number = 0;
  private translateY: number = 0;

  constructor(props) {
    super(props);
    this.state = {
      items: [],
      activeIndex: props.activeIndex,
      activeIndexChanged: false,
    };
  }

  componentWillMount() {
    this.parseItems(this.props);
    this.startAutoPlay();
  }

  componentDidMount() {
    // 监听窗口变化
    Events.on(window, 'resize', this.resize);

    // 设置起始位置编号
    this.onJumpTo(this.props.activeIndex);
  }

  componentWillReceiveProps(nextProps) {
    if ('children' in nextProps) {
      this.parseItems(nextProps);
    }

    if ('activeIndex' in nextProps) {
      this.onJumpTo(nextProps.activeIndex);
    }
  }

  componentWillUnmount() {
    // 自动轮播结束
    this.pauseAutoPlay();

    // 移除监听窗口变化
    Events.off(window, 'resize', this.resize);
    Events.off(this.carouselItems, 'webkitTransitionEnd', this.transitionEnd);
    Events.off(this.carouselItems, 'transitionend', this.transitionEnd);
  }

  // 滑动到指定编号
  onSlideTo = (index) => {
    this.onMoveTo(index, this.props.animationDuration);
  }

  // 静默跳到指定编号
  onJumpTo = (index) => {
    this.onMoveTo(index, 0);
  }

  // 移动到指定编号
  onMoveTo = (index, animationDuration) => {
    const dom = this.carouselItems;

    const { loop, children, onChange } = this.props;
    const maxLength = children.length;
    const previousIndex = this.state.activeIndex;

    this.translateX = -dom.offsetWidth * (index + loop);
    this.translateY = -dom.offsetHeight * (index + loop);
    this.doTransition({ x: this.translateX, y: this.translateY }, animationDuration);

    if (index > maxLength - 1) {
      index = 0;
    } else if (index < 0) {
      index = maxLength - 1;
    }
    const activeIndexChanged = previousIndex !== index;
    this.setState({
      activeIndex: index,
      activeIndexChanged,
    });

    if (typeof onChange === 'function' && activeIndexChanged) {
      onChange(index);
    }
  }

  // 触屏事件
  onDragStart = () => {
    // 跳转到头尾
    const activeIndex = this.state.activeIndex;
    const maxLength = this.props.children.length;

    if (activeIndex <= 0) {
      this.onJumpTo(0);
    } else if (activeIndex >= (maxLength - 1)) {
      this.onJumpTo(maxLength - 1);
    }

    // 暂停自动轮播
    this.pauseAutoPlay();
  }

  onDragMove = (event, { offsetX, offsetY }) => {
    const distanceX = Math.abs(offsetX);
    const distanceY = Math.abs(offsetY);

    if (this.isDirectionX() && (distanceX < 5 || (distanceX >= 5 && distanceY >= 1.73 * distanceX))) {
      return false;
    }

    if (!this.isDirectionX() && (distanceY < 5 || (distanceY >= 5 && distanceX >= 1.73 * distanceY))) {
      return false;
    }

    // 设置不循环的时候
    if (!this.props.loop) {
      // 在尾页时禁止拖动
      if (this.isLastIndex()) {
        if (
          this.isDirectionX() && offsetX < 0 ||
          !this.isDirectionX() && offsetY < 0
        ) {
          return false;
        }
      }

      // 在首页时禁止拖动
      if (this.isFirstIndex()) {
        if (
          this.isDirectionX() && offsetX > 0 ||
          !this.isDirectionX() && offsetY > 0
        ) {
          return false;
        }
      }
    }

    event.preventDefault();

    this.doTransition({ x: this.translateX + offsetX, y: this.translateY + offsetY }, 0);
    return true;
  }

  onDragEnd = (_event, { offsetX, offsetY, startTime }) => {
    if (!offsetX && !offsetY) {
      return;
    }

    const { moveDistanceRatio, moveTimeSpan } = this.props;
    let { activeIndex } = this.state;

    const dom = this.carouselItems;
    const timeSpan = new Date().getTime() - startTime.getTime();
    const ratio = this.isDirectionX()
      ? Math.abs(offsetX / dom.offsetWidth)
      : Math.abs(offsetY / dom.offsetHeight);

    // 判断滑动临界点
    // 1.滑动距离超过0，且滑动距离和父容器长度之比超过moveDistanceRatio
    // 2.滑动释放时间差低于moveTimeSpan
    if (ratio >= moveDistanceRatio! || timeSpan <= moveTimeSpan!) {
      const action = (this.isDirectionX() && offsetX > 0) || (!this.isDirectionX() && offsetY > 0)
        ? 'prev'
        : 'next';

      activeIndex = (action === 'next')
        ? activeIndex + 1
        : activeIndex - 1;
    }

    this.onSlideTo(activeIndex);

    // 恢复自动轮播
    this.startAutoPlay();
  }

  // 自动轮播开始
  startAutoPlay = () => {
    const { direction, loop, autoPlay, autoPlayIntervalTime } = this.props;

    this.moveInterval = (autoPlay && setInterval(() => {
      let activeIndex = this.state.activeIndex;
      const isLeftOrUpDirection = (['left', 'up']).indexOf(direction!) > -1;

      activeIndex = isLeftOrUpDirection
        ? (activeIndex + 1)
        : (activeIndex - 1);

      // 不循环暂停轮播
      if (!loop && (isLeftOrUpDirection ? this.isLastIndex() : this.isFirstIndex())) {
        this.pauseAutoPlay();
        return;
      }
      this.onSlideTo(activeIndex);
    }, autoPlayIntervalTime));
  }

  // 暂停自动轮播
  pauseAutoPlay = () => {
    if (this.moveInterval) {
      clearInterval(this.moveInterval);
    }
  }

  // 处理节点（首尾拼接）
  parseItems = (props) => {
    if (props.children.length === 0) {
      return;
    }

    // 增加头尾拼接节点
    const items = [].concat(props.children);
    const firstItem = items[0];
    const lastItem = items[items.length - 1];

    if (props.loop) {
      items.push(firstItem);
      items.unshift(lastItem);
    }

    // 节点追加后重排key
    const newItems = React.Children.map(items, (element: any, index) => {
      return cloneElement(element, {
        key: index,
        className: classnames({
          [`${props.prefixCls}-item`]: true,
          [element.props.className]: !!element.props.className,
        }),
      });
    });

    this.setState({
      items: newItems,
    });
  }

  // 更新窗口变化的位置偏移
  resize = () => {
    this.onJumpTo(this.state.activeIndex);
  }

  // 执行过渡动画
  doTransition = (offset, animationDuration) => {
    const dom = this.carouselItems;
    let x = 0;
    let y = 0;

    if (this.isDirectionX()) {
      x = offset.x;
    } else {
      y = offset.y;
    }

    dom.style.WebkitTransformDuration = `${animationDuration}ms`;
    dom.style.transitionDuration = `${animationDuration}ms`;
    dom.style.WebkitTransform = `translate3d(${x}px, ${y}px, 0)`;
    dom.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }

  transitionEnd = () => {
    const activeIndex = this.state.activeIndex;
    const dom = this.carouselItems;

    this.translateX = -dom.offsetWidth * (activeIndex + this.props.loop);
    this.translateY = -dom.offsetHeight * (activeIndex + this.props.loop);
    this.doTransition({ x: this.translateX, y: this.translateY }, 0);

    const { onChangeEnd } = this.props;
    if (typeof onChangeEnd === 'function' && this.state.activeIndexChanged) {
      onChangeEnd(activeIndex);
    }
  }

  // 判断当前是否在最后一页
  isLastIndex = () => {
    return this.state.activeIndex >= this.props.children.length - 1;
  }

  // 判断当前是否在第一页
  isFirstIndex = () => {
    return this.state.activeIndex <= 0;
  }

  // 是否横向移动
  isDirectionX = () => {
    return (['left', 'right'].indexOf(this.props.direction!) > -1);
  }

  renderPaginationItem = (_result, index) => {
    const paginationStyle: CSSProperties = {};

    if (this.isDirectionX()) {
      paginationStyle.display = 'inline-block';
    }

    return (
      <li
        role="tab"
        key={`pagination-${index}`}
        className={classnames({ active: index === this.state.activeIndex })}
        style={paginationStyle}
        onClick={() => this.onSlideTo(index)}
      />
    );
  }

  renderPagination = () => {
    const { prefixCls, children } = this.props;
    const direction = this.isDirectionX() ? 'horizontal' : 'vertical';

    return (
      <div className={`${prefixCls}-pagination ${direction}`}>
        <ul>
          {Children.map(children, this.renderPaginationItem)}
        </ul>
      </div>
    );
  }

  render() {
    const { prefixCls, className, height, showPagination, style } = this.props;
    const cls = classnames(prefixCls, className);
    const itemsStyle: CSSProperties = { ...style };

    if (!this.isDirectionX()) {
      itemsStyle.height = height;
    } else {
      itemsStyle.whiteSpace = 'nowrap';
    }

    return (
      <div className={cls}>
        <Drag
          onDragStart={this.onDragStart}
          onDragMove={this.onDragMove}
          onDragEnd={this.onDragEnd}
        >
          <div
            ref={(ele) => { this.carouselItems = ele; }}
            className={`${prefixCls}-items`}
            onTransitionEnd={this.transitionEnd}
            style={itemsStyle}
          >
            {this.state.items}
          </div>
        </Drag>
        {showPagination && this.renderPagination()}
      </div>
    );
  }
}
