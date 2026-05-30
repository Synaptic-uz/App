## CSS da Shadow turlari

### 1. `box-shadow`
Elementning **tashqi** yoki ichki soyasi
```css
/* offset-x | offset-y | blur | spread | color */
box-shadow: 0 4px 8px 0 rgba(0,0,0,0.2);

/* Bir nechta */
box-shadow: 0 2px 4px red, 0 8px 16px blue;

/* Ichki soya */
box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);
```

---

### 2. `text-shadow`
**Matn** soyasi
```css
/* offset-x | offset-y | blur | color */
text-shadow: 2px 2px 4px rgba(0,0,0,0.5);

/* Glow effekt */
text-shadow: 0 0 10px #58CC02;
```

---

### 3. `filter: drop-shadow()`
**PNG/SVG** shakliga qarab soya (box-shadow dan farqi shu)
```css
/* box-shadow to'rtburchak soya beradi */
/* drop-shadow esa elementning haqiqiy shakliga soya beradi */
filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));
```
