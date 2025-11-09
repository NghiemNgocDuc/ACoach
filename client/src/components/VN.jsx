import React from 'react';

const VN = ({ eyeContactData, bodyLanguageData, isActive = true }) => {
  const getPostureColor = (posture) => {
    switch (posture) {
      case 'good': return '#00ff08ff';
      case 'slightly_off': return '#ff0000ff';
      case 'slouched': return '#f44336';
      default: return '#446c8dff';
    }
  };

  const getPostureText = (posture) => {
    switch (posture) {
      case 'good': return 'Excellent';
      case 'slightly_off': return 'Good';
      case 'slouched': return 'Needs Improvement';
      default: return 'Unknown';
    }
  };

  const getGazeDirectionText = (direction) => {
    switch (direction) {
      case 'center': return 'Facing camera';
      case 'left': return 'Facing left';
      case 'right': return 'Facing right';
      case 'up': return 'Facing up';
      case 'down': return 'Facing down';
      default: return 'Unknown';
    }
  };

  return (
    <div className="vision-metrics">
      <h3>
        Analysis
        {isActive ? (
          <span className="analysis-status active"></span>
        ) : (
          <span className="analysis-status frozen"></span>
        )}
      </h3>
      
      {/* Metrics side by side */}
      <div className="metrics-row">
        {/* Eye Contact Metrics */}
        <div className="metric-card eye-contact">
          <h4>Eye Contact</h4>
          <div className="metric-value">
            {eyeContactData.eContactPercentage.toFixed(0)}%
          </div>
          <div className="metric-details">
            <p><strong>Is looking at camera:</strong> {eyeContactData.isLookingAtCamera ? 'Yes' : 'No'}</p>
            <p><strong>Comment:</strong> {getGazeDirectionText(eyeContactData.gazeDirection)}</p>
          </div>
        </div>

        {/* Body Language Metrics */}
        <div className="metric-card body-language">
          <h4>Body Language</h4>
          <div className="metric-details">
            <p><strong>Posture:</strong> 
              <span style={{ color: getPostureColor(bodyLanguageData.posture) }}>
                {' '}{getPostureText(bodyLanguageData.posture)}
              </span>
            </p>
            <p><strong>Hand</strong> {bodyLanguageData.hGestures} active</p>
            <p><strong>Confidence:</strong> {bodyLanguageData.confidence.toFixed(0)}%</p>
          </div>
        </div>
      </div>

      {/* Real-time Feedback */}
      <div className="vision-feedback">
        <h4>Feedback</h4>
        <div className="feedback-tips">
          {eyeContactData.eContactPercentage < 30 && (
            <p className="tip warning">Look at the camera more</p>
          )}
          {bodyLanguageData.posture === 'slouched' && (
            <p className="tip warning">Straighten posture</p>
          )}
          {bodyLanguageData.hGestures === 0 && (
            <p className="tip info">Use hand gestures</p>
          )}
          {eyeContactData.eContactPercentage > 70 && bodyLanguageData.posture === 'good' && (
            <p className="tip success">Good eye contact + posture</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default VN;
