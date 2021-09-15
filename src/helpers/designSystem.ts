import { create } from 'tailwind-rn';
import styles from '../../styles.json';

interface Tailwind {
	tailwind: (classNames: string) => {[key: string]: string};
	getColor: (color: string) => string;
}

const { getColor, tailwind } = create(styles);

export { getColor, tailwind };
