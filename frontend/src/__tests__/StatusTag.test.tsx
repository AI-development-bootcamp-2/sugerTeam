import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatusTag from '../pages/time-report/components/StatusTag';

describe('StatusTag', () => {
  describe('filled', () => {
    it('shows formatted hours and ש׳ suffix', () => {
      render(<StatusTag status="filled" reportedMinutes={540} />);
      expect(screen.getByText(/09:00/)).toBeInTheDocument();
    });

    it('renders an SVG (up arrow icon)', () => {
      const { container } = render(<StatusTag status="filled" reportedMinutes={60} />);
      expect(container.querySelectorAll('svg')).toHaveLength(1);
    });

    it('applies green background color', () => {
      const { container } = render(<StatusTag status="filled" reportedMinutes={60} />);
      const span = container.querySelector('span') as HTMLElement;
      expect(span.style.background).toBe('rgb(227, 249, 202)');
      expect(span.style.color).toBe('rgb(46, 125, 20)');
    });
  });

  describe('open', () => {
    it('shows formatted hours and ש׳ suffix', () => {
      render(<StatusTag status="open" reportedMinutes={540} />);
      expect(screen.getByText(/09:00/)).toBeInTheDocument();
    });

    it('applies same green style as filled', () => {
      const { container } = render(<StatusTag status="open" reportedMinutes={60} />);
      const span = container.querySelector('span') as HTMLElement;
      expect(span.style.background).toBe('rgb(227, 249, 202)');
    });
  });

  describe('missing', () => {
    it('shows חסר label', () => {
      render(<StatusTag status="missing" />);
      expect(screen.getByText(/חסר/)).toBeInTheDocument();
    });

    it('applies red background color', () => {
      const { container } = render(<StatusTag status="missing" />);
      const span = container.querySelector('span') as HTMLElement;
      expect(span.style.background).toBe('rgb(252, 227, 214)');
      expect(span.style.color).toBe('rgb(231, 0, 11)');
    });

    it('renders an SVG (down arrow icon)', () => {
      const { container } = render(<StatusTag status="missing" />);
      expect(container.querySelectorAll('svg')).toHaveLength(1);
    });
  });

  describe('weekend', () => {
    it('shows סוף שבוע label', () => {
      render(<StatusTag status="weekend" />);
      expect(screen.getByText('סוף שבוע')).toBeInTheDocument();
    });

    it('applies blue background color', () => {
      const { container } = render(<StatusTag status="weekend" />);
      const span = container.querySelector('span') as HTMLElement;
      expect(span.style.background).toBe('rgb(222, 234, 255)');
      expect(span.style.color).toBe('rgb(12, 105, 255)');
    });

    it('renders no SVG icon', () => {
      const { container } = render(<StatusTag status="weekend" />);
      expect(container.querySelectorAll('svg')).toHaveLength(0);
    });
  });

  describe('holiday', () => {
    it('shows חג label', () => {
      render(<StatusTag status="holiday" />);
      expect(screen.getByText('חג')).toBeInTheDocument();
    });

    it('applies blue background color', () => {
      const { container } = render(<StatusTag status="holiday" />);
      const span = container.querySelector('span') as HTMLElement;
      expect(span.style.background).toBe('rgb(222, 234, 255)');
    });

    it('renders no SVG icon', () => {
      const { container } = render(<StatusTag status="holiday" />);
      expect(container.querySelectorAll('svg')).toHaveLength(0);
    });
  });

  describe('vacation', () => {
    it('shows חופשה label', () => {
      render(<StatusTag status="vacation" />);
      expect(screen.getByText('חופשה')).toBeInTheDocument();
    });

    it('applies orange background color', () => {
      const { container } = render(<StatusTag status="vacation" />);
      const span = container.querySelector('span') as HTMLElement;
      expect(span.style.background).toBe('rgb(255, 229, 208)');
      expect(span.style.color).toBe('rgb(194, 99, 14)');
    });

    it('renders no SVG icon', () => {
      const { container } = render(<StatusTag status="vacation" />);
      expect(container.querySelectorAll('svg')).toHaveLength(0);
    });
  });

  describe('time formatting', () => {
    it('540 minutes → 09:00 ש׳', () => {
      render(<StatusTag status="filled" reportedMinutes={540} />);
      expect(screen.getByText(/09:00/)).toBeInTheDocument();
    });

    it('90 minutes → 01:30 ש׳', () => {
      render(<StatusTag status="open" reportedMinutes={90} />);
      expect(screen.getByText(/01:30/)).toBeInTheDocument();
    });

    it('0 minutes → 00:00 ש׳', () => {
      render(<StatusTag status="open" reportedMinutes={0} />);
      expect(screen.getByText(/00:00/)).toBeInTheDocument();
    });
  });
});
