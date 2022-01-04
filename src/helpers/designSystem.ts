import { create } from 'tailwind-rn';
import styles from '../../styles.json';

const { getColor, tailwind } = create(styles);

export { getColor, tailwind };
