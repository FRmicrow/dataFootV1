# BUG_28e_V3_FE_POC_Recording_Auto_Reset

## Develop this feature as Frontend Agent - Following the US related:
`BUG_28e_V3_FE_POC_Recording_Auto_Reset`

Fix the recording workflow to always start from frame 0 and auto-stop at the end.

---

**Role**: Frontend Expert Agent  
**Objective**: Ensure video recording captures the complete animation cycle cleanly.

## 🐛 Bug Description
**Current Behavior** (from original US_28e):
- Recording might start mid-animation if user hasn't reset manually.
- Recording might not stop automatically at the end, requiring manual intervention.

**Expected Behavior**:
- Clicking "Record" immediately resets animation to frame 0.
- Recording starts as animation begins.
- Recording stops automatically when the final frame completes.

## ✅ Fix Requirements

### 1. Auto-Reset Before Recording
- [ ] **Trigger**: When user clicks "🎬 Record & Download" button.
- [ ] **Action**: 
    1. Pause any currently playing animation.
    2. Reset animation state to frame 0.
    3. Wait 500ms for canvas to render frame 0 cleanly.
    4. Start MediaRecorder.
    5. Start animation playback.

### 2. Auto-Stop After Animation Completes
- [ ] **Detection**: Listen for the animation's `onAnimationEnd` event.
- [ ] **Action**:
    1. When final frame finishes rendering, wait 200ms (buffer).
    2. Stop MediaRecorder.
    3. Finalize video blob.
    4. Trigger download automatically.
    5. Add file to "Generated Files" table.

### 3. Recording State Management
- [ ] **States**: `'idle' | 'preparing' | 'recording' | 'processing' | 'complete'`
- [ ] **UI Indicators**:
    - `preparing`: Show spinner "Resetting animation..."
    - `recording`: Red pulsing dot + "Recording..." text
    - `processing`: Spinner "Finalizing video..."
    - `complete`: Green checkmark "Video ready!" + auto-download

### 4. Error Handling
- [ ] **If animation is still generating**: Disable "Record" button with tooltip "Wait for preview to load".
- [ ] **If recording fails**: Show error toast "Recording failed. Try again or use a different browser."
- [ ] **Browser compatibility check**: Warn if MediaRecorder API is not supported (Safari).

## 🛠 Technical Implementation
```javascript
const handleRecord = async () => {
  setRecordingState('preparing');
  
  // 1. Reset to frame 0
  resetAnimation();
  await sleep(500);
  
  // 2. Start recorder
  const stream = canvasRef.current.captureStream(30);
  const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
  const chunks = [];
  
  recorder.ondataavailable = (e) => chunks.push(e.data);
  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: 'video/webm' });
    downloadVideo(blob);
    setRecordingState('complete');
  };
  
  recorder.start();
  setRecordingState('recording');
  
  // 3. Play animation and auto-stop when done
  playAnimation({
    onComplete: () => {
      setTimeout(() => recorder.stop(), 200);
      setRecordingState('processing');
    }
  });
};
```

## 🧪 Test Cases
- [ ] Test with a 5-frame animation (should record exactly 5 frames).
- [ ] Test with different speeds (0.5x, 1x, 3x) — duration should scale correctly.
- [ ] Test recording → cancel mid-way → record again (should start fresh).
- [ ] Test recording multiple charts back-to-back (memory leak check).
