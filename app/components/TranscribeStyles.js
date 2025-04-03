export const styles = `
.transcribe-container {
  max-width: 42rem;
  margin: 0 auto;
  padding: 1.5rem;
  background: linear-gradient(135deg, #f9fafb 0%, #f0f9ff 100%);
  min-height: 100vh;
  font-family: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
}

.model-loading-card {
  background-color: rgba(239, 246, 255, 0.9);
  backdrop-filter: blur(4px);
  padding: 1rem;
  border-radius: 0.75rem;
  border: 1px solid rgba(191, 219, 254, 0.8);
  margin-bottom: 1.5rem;
}

.progress-container {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.progress-bar {
  width: 100%;
  background-color: #e5e7eb;
  border-radius: 9999px;
  height: 0.625rem;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 9999px;
  background: linear-gradient(90deg, #3b82f6 0%, #2563eb 100%);
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.875rem;
  font-weight: 500;
  color: #1e40af;
  white-space: nowrap;
}

.loading-text {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #1e40af;
  font-size: 0.875rem;
}

.loading-note {
  font-size: 0.75rem;
  color: #3b82f6;
  margin-top: 0.25rem;
  padding-left: 1.5rem;
}

.error-card {
  background-color: rgba(254, 242, 242, 0.9);
  backdrop-filter: blur(4px);
  padding: 1rem;
  border-radius: 0.75rem;
  border: 1px solid rgba(254, 226, 226, 0.8);
  margin-bottom: 1.5rem;
}

.error-content {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.error-title {
  font-weight: 700;
  color: #991b1b;
  margin-bottom: 0.25rem;
}

.error-message {
  font-size: 0.875rem;
  color: #b91c1c;
  margin-bottom: 0.75rem;
}

.reload-button {
  padding: 0.5rem 1rem;
  background: linear-gradient(90deg, #ef4444 0%, #dc2626 100%);
  color: white;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.reload-button:hover {
  background: linear-gradient(90deg, #dc2626 0%, #b91c1c 100%);
}

.record-button {
  width: 100%;
  padding: 1.25rem 2rem;
  border-radius: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  color: white;
  font-weight: 600;
  font-size: 1.125rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  border: none;
  cursor: pointer;
  margin-bottom: 2rem;
}

.record-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.record-button.recording {
  background: linear-gradient(90deg, #ef4444 0%, #dc2626 100%);
  box-shadow: 0 4px 24px -2px rgba(239, 68, 68, 0.3);
}

.record-button.not-recording {
  background: linear-gradient(90deg, #60a5fa 0%, #8b5cf6 100%);
}

.record-button.not-recording:hover {
  background: linear-gradient(90deg, #3b82f6 0%, #7c3aed 100%);
  transform: scale(1.02);
}

.pulse-animation {
  position: absolute;
  inset: 0;
  border-radius: 1rem;
  border: 2px solid rgba(254, 202, 202, 0.8);
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 0.3;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.6;
  }
  100% {
    transform: scale(1);
    opacity: 0.3;
  }
}

.permission-warning {
  background-color: rgba(254, 252, 232, 0.9);
  backdrop-filter: blur(4px);
  padding: 1rem;
  border-radius: 0.75rem;
  border: 1px solid rgba(253, 230, 138, 0.8);
  margin-bottom: 1.5rem;
}

.warning-content {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.warning-title {
  font-weight: 700;
  color: #92400e;
  margin-bottom: 0.25rem;
}

.warning-message {
  font-size: 0.875rem;
  color: #b45309;
  margin-bottom: 0.5rem;
}

.try-again-button {
  font-size: 0.875rem;
  color: #b45309;
  text-decoration: underline;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  margin-top: 0.25rem;
}

.try-again-button:hover {
  color: #92400e;
}

.card {
  background-color: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(4px);
  padding: 1.5rem;
  border-radius: 1rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.9);
  margin-bottom: 1.5rem;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  color: #374151;
  font-size: 0.9375rem;
}

.dot {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 9999px;
  flex-shrink: 0;
}

.blue-dot {
  background: linear-gradient(90deg, #60a5fa 0%, #8b5cf6 100%);
}

.purple-dot {
  background: linear-gradient(90deg, #a78bfa 0%, #ec4899 100%);
}

.card-action {
  font-size: 0.875rem;
  color: #3b82f6;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}

.card-action:hover {
  color: #2563eb;
}

.card-content {
  min-height: 8rem;
  padding: 1rem;
  background-color: rgba(255, 255, 255, 0.5);
  border-radius: 0.5rem;
  border: 1px solid rgba(243, 244, 246, 0.8);
}

.transcript-text {
  color: #1f2937;
  line-height: 1.6;
  white-space: pre-line;
}

.placeholder-text {
  color: #9ca3af;
  font-style: italic;
}

.ai-response-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.action-button {
  color: #6b7280;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 0.375rem;
  transition: all 0.2s ease;
}

.action-button:hover {
  background-color: rgba(243, 244, 246, 0.5);
  color: #3b82f6;
}

.retry-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #3b82f6;
  background-color: rgba(219, 234, 254, 0.5);
  padding: 0.375rem 0.75rem;
  border-radius: 0.375rem;
  border: none;
  cursor: pointer;
}

.retry-button:hover {
  background-color: rgba(219, 234, 254, 0.8);
}

.error-response {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  color: #991b1b;
}

.error-main {
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.error-detail {
  font-size: 0.8125rem;
  opacity: 0.8;
}

.disclaimer {
  text-align: center;
  padding-top: 2rem;
  color: #6b7280;
  font-size: 0.8125rem;
  line-height: 1.5;
  max-width: 42rem;
  margin: 0 auto;
}

.disclaimer-icon {
  margin-right: 0.375rem;
  vertical-align: middle;
}

`;
