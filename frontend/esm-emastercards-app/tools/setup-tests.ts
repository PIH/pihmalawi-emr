import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(cleanup);

// Set by the O3 app shell at runtime
(window as any).openmrsBase = '/openmrs';
(window as any).getOpenmrsSpaBase = () => '/openmrs/spa/';
