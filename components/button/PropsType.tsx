export default interface PropsType {
  theme?: 'primary' | 'success' | 'warning' | 'error';
  size?: 'md' | 'lg' | 'sm' | 'xs';
  shape?: 'radius' | 'rect' | 'round' | 'circle';
  block?: boolean;
  ghost?: boolean;
  active?: boolean;
  focus?: boolean;
  disabled?: boolean;
  loading?: boolean;
  icon?: JSX.Element;
  onClick?: (e?: any) => void;
}
