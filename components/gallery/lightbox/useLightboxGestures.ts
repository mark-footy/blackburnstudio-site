"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
  type TouchEvent as ReactTouchEvent,
} from "react";

import {
  CLOSE_THRESHOLD,
  DIRECTION_LOCK,
  DISTANCE_RATIO,
  FREE_DRAG_RATIO,
  RESISTANCE_RATIO,
  SLIDE_GAP_DESKTOP,
  SLIDE_GAP_MOBILE,
  TAP_MOVEMENT_THRESHOLD,
  VELOCITY_THRESHOLD,
  VERTICAL_CLOSE_VELOCITY,
} from "@/components/gallery/lightbox/constants";
import type { Axis } from "@/components/gallery/types";

type UseLightboxGesturesArgs = {
  viewportRef: RefObject<HTMLDivElement | null>;
  index: number;
  total: number;
  setIndex: (i: number) => void;
  onClose: () => void;
};

export type LightboxGestures = {
  dragX: number;
  dragY: number;
  animating: boolean;
  slideGap: number;
  viewportWidth: number;
  prevIndex: number;
  nextIndex: number;
  goPrev: () => void;
  goNext: () => void;
  touchHandlers: {
    onTouchStart: (e: ReactTouchEvent) => void;
    onTouchMove: (e: ReactTouchEvent) => void;
    onTouchEnd: (e: ReactTouchEvent) => void;
  };
};

export function useLightboxGestures({
  viewportRef,
  index,
  total,
  setIndex,
  onClose,
}: UseLightboxGesturesArgs): LightboxGestures {
  const prevIndex = (index - 1 + total) % total;
  const nextIndex = (index + 1) % total;

  const [dragX, setDragX] = useState(0);
  const [dragY, setDragY] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [slideGap, setSlideGap] = useState(SLIDE_GAP_MOBILE);
  const [viewportWidth, setViewportWidth] = useState(0);

  const animatingRef = useRef(false);
  const axisRef = useRef<Axis>("none");
  const startX = useRef(0);
  const startY = useRef(0);
  const startTime = useRef(0);
  const movedRef = useRef(false);
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    const m = window.matchMedia("(min-width: 768px)");
    const apply = () =>
      setSlideGap(m.matches ? SLIDE_GAP_DESKTOP : SLIDE_GAP_MOBILE);
    apply();
    m.addEventListener("change", apply);
    return () => m.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const measure = () => {
      setViewportWidth(viewportRef.current?.offsetWidth ?? window.innerWidth);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [viewportRef]);

  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotionRef.current = m.matches;
    const handler = () => (reducedMotionRef.current = m.matches);
    m.addEventListener("change", handler);
    return () => m.removeEventListener("change", handler);
  }, []);

  const goTo = useCallback(
    (target: number) => {
      if (animatingRef.current) return;
      const width = viewportRef.current?.offsetWidth ?? window.innerWidth;
      const direction =
        target === nextIndex ? -1 : target === prevIndex ? 1 : 0;
      if (direction === 0 || reducedMotionRef.current) {
        setIndex(target);
        setDragX(0);
        setDragY(0);
        return;
      }
      animatingRef.current = true;
      setAnimating(true);
      setDragX(direction * (width + slideGap));
      window.setTimeout(() => {
        setIndex(target);
        setAnimating(false);
        animatingRef.current = false;
        setDragX(0);
      }, 260);
    },
    [nextIndex, prevIndex, setIndex, slideGap, viewportRef],
  );

  const goPrev = useCallback(() => goTo(prevIndex), [goTo, prevIndex]);
  const goNext = useCallback(() => goTo(nextIndex), [goTo, nextIndex]);

  const applyResistance = useCallback((delta: number, width: number) => {
    const freeLimit = width * FREE_DRAG_RATIO;
    if (Math.abs(delta) <= freeLimit) return delta;
    const excess = Math.abs(delta) - freeLimit;
    const easedExcess =
      excess * RESISTANCE_RATIO * (1 - Math.exp(-excess / 120));
    return Math.sign(delta) * (freeLimit + easedExcess);
  }, []);

  const dampenStart = useCallback(
    (delta: number) => (Math.abs(delta) < 12 ? delta * 0.6 : delta),
    [],
  );

  const onTouchStart = useCallback((e: ReactTouchEvent) => {
    if (animatingRef.current) return;
    const t = e.touches[0];
    startX.current = t.clientX;
    startY.current = t.clientY;
    startTime.current = performance.now();
    axisRef.current = "none";
    movedRef.current = false;
    setAnimating(false);
  }, []);

  const onTouchMove = useCallback(
    (e: ReactTouchEvent) => {
      if (animatingRef.current) return;
      const t = e.touches[0];
      const dx = t.clientX - startX.current;
      const dy = t.clientY - startY.current;

      if (
        Math.abs(dx) > TAP_MOVEMENT_THRESHOLD ||
        Math.abs(dy) > TAP_MOVEMENT_THRESHOLD
      ) {
        movedRef.current = true;
      }

      if (axisRef.current === "none") {
        if (Math.abs(dx) > Math.abs(dy) + DIRECTION_LOCK) axisRef.current = "x";
        else if (Math.abs(dy) > Math.abs(dx) + DIRECTION_LOCK)
          axisRef.current = "y";
        else return;
      }

      if (axisRef.current === "x") {
        const width = viewportRef.current?.offsetWidth ?? window.innerWidth;
        // Strict horizontal lock: ignore vertical motion entirely once locked to x.
        setDragX(applyResistance(dampenStart(dx), width));
        if (dragY !== 0) setDragY(0);
      } else if (axisRef.current === "y") {
        // Pure vertical close gesture: no horizontal drift.
        if (dragX !== 0) setDragX(0);
        setDragY(dy);
      }
    },
    [applyResistance, dampenStart, dragX, dragY, viewportRef],
  );

  const onTouchEnd = useCallback(
    (e: ReactTouchEvent) => {
      if (animatingRef.current) return;
      const width = viewportRef.current?.offsetWidth ?? window.innerWidth;
      const distanceThreshold = Math.max(50, width * DISTANCE_RATIO);
      const elapsed = Math.max(1, performance.now() - startTime.current);

      if (axisRef.current === "x") {
        const velocity = dragX / elapsed; // px/ms (signed)
        const directionIntent = Math.sign(velocity) === Math.sign(dragX);
        const fastEnough =
          Math.abs(velocity) >= VELOCITY_THRESHOLD && directionIntent;
        const farEnough = Math.abs(dragX) >= distanceThreshold;
        if (farEnough || fastEnough) {
          if (dragX < 0) goTo(nextIndex);
          else goTo(prevIndex);
        } else {
          requestAnimationFrame(() => {
            setAnimating(true);
            setDragX(0);
          });
          window.setTimeout(() => setAnimating(false), 260);
        }
      } else if (axisRef.current === "y") {
        const velocityY = dragY / elapsed; // px/ms (signed)
        const fastVerticalClose =
          Math.abs(velocityY) >= VERTICAL_CLOSE_VELOCITY;
        if (Math.abs(dragY) >= CLOSE_THRESHOLD || fastVerticalClose) {
          window.setTimeout(() => onClose(), 50);
        } else {
          requestAnimationFrame(() => {
            setAnimating(true);
            setDragX(0);
            setDragY(0);
          });
          window.setTimeout(() => setAnimating(false), 260);
        }
      } else if (!movedRef.current) {
        // Treat as tap: forgiving mobile zones (left 40% / right 40%)
        const rect = viewportRef.current?.getBoundingClientRect();
        const t = e.changedTouches[0];
        if (rect && t) {
          const xRel = (t.clientX - rect.left) / rect.width;
          if (xRel <= 0.4) goTo(prevIndex);
          else if (xRel >= 0.6) goTo(nextIndex);
        }
      }
      axisRef.current = "none";
      movedRef.current = false;
    },
    [dragX, dragY, goTo, nextIndex, onClose, prevIndex, viewportRef],
  );

  return {
    dragX,
    dragY,
    animating,
    slideGap,
    viewportWidth,
    prevIndex,
    nextIndex,
    goPrev,
    goNext,
    touchHandlers: { onTouchStart, onTouchMove, onTouchEnd },
  };
}
