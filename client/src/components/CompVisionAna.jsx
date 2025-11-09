import React from "react";
import { useRef, useEffect, useState } from 'react';

const CompVisionAna = ({ videoR, onUpdate, isActive = true }) => {
  const canvasRef = useRef(null);
  const faceMeshRef = useRef(null);
  const poseRef = useRef(null);
  const handsRef = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const [bodyLanguageData, sBodyLanguage] = useState({
    posture: 'good',
    hGestures: 0,
    movement: 'minimal',
    confidence: 0
  });

  const [eyeContactData, setEyec] = useState({
    isLookingAtCamera: false,
    eContactPercentage: 0,
    gazeDirection: 'center'
  });

  
  

  
  const [previousLandmarks, setpreviouslandmarks] = useState(null);

  useEffect(() => {
    const iMediaPipe = async () => {
      try {
        console.log('Initializing');
        
        
        let FaceMesh, Pose, Hands;
        
        if (import.meta.env.DEV) {
          
          const faceMeshModule = await import('@mediapipe/face_mesh');
          const poseModule = await import('@mediapipe/pose');
          const handsModule = await import('@mediapipe/hands');
          FaceMesh = faceMeshModule.FaceMesh;
          Pose = poseModule.Pose;
          Hands = handsModule.Hands;
        } else {
          
          const faceMeshModule = await import('https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js');
          const poseModule = await import('https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js');
          const handsModule = await import('https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js');
          FaceMesh = faceMeshModule.FaceMesh;
          Pose = poseModule.Pose;
          Hands = handsModule.Hands;
        }
        
        
        const isProd = import.meta.env.PROD;
        const faceMesh = new FaceMesh({
          locateFile: (file) => {
            const url = isProd 
              ? `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
              : `/node_modules/@mediapipe/face_mesh/${file}`;
            console.log("Loading MediaPipe FaceMesh asset:", file, "->", url);
            return url;
          }
        });

        faceMesh.setOptions({
          maxNumFaces: 1,
          refineLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        
        const pose = new Pose({
          locateFile: (file) => {
            const url = isProd 
              ? `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
              : `/node_modules/@mediapipe/pose/${file}`;
            console.log("Loading MediaPipe Pose asset:", file, "->", url);
            return url;
          }
        });

        pose.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          enableSegmentation: false,
          smoothSegmentation: false,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        
        const hands = new Hands({
          locateFile: (file) => {
            const url = isProd 
              ? `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
              : `/node_modules/@mediapipe/hands/${file}`;
            console.log("Loading MediaPipe Hands asset:", file, "->", url);
            return url;
          }
        });

        hands.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        
        faceMesh.onResults((results) => {
          console.log('FaceMesh results:', {
            hasMultiFaceLandmarks: !!results.multiFaceLandmarks,
            landmarkCount: results.multiFaceLandmarks?.length || 0,
            hasImage: !!results.image,
            imageSize: results.image ? `${results.image.width}x${results.image.height}` : 'none'
          });
          
          if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
            console.log('Face detected, analyzing eye contact...');
            aEyeContact(results.multiFaceLandmarks[0]);
          } else {
            console.log('No face landmarks detected');
          }
        });

        
        pose.onResults((results) => {
          console.log('Pose results:', {
            hasPoseLandmarks: !!results.poseLandmarks,
            landmarkCount: results.poseLandmarks?.length || 0,
            hasImage: !!results.image,
            imageSize: results.image ? `${results.image.width}x${results.image.height}` : 'none'
          });
          
          if (results.poseLandmarks) {
            console.log('Pose detected, analyzing body language...');
            aBodyLanguage(results.poseLandmarks);
          } else {
            console.log('No pose landmarks detected');
          }
        });

        
        hands.onResults((results) => {
          console.log('Hands results:', {
            hasMultiHandLandmarks: !!results.multiHandLandmarks,
            landmarkCount: results.multiHandLandmarks?.length || 0,
            hasImage: !!results.image,
            imageSize: results.image ? `${results.image.width}x${results.image.height}` : 'none'
          });
          
          if (results.multiHandLandmarks) {
            console.log('Hands detected, analyzing gestures...');
            analyzehGestures(results.multiHandLandmarks);
          } else {
            console.log('No hand landmarks detected');
          }
        });

        faceMeshRef.current = faceMesh;
        poseRef.current = pose;
        handsRef.current = hands;

        console.log('MediaPipe models initialized successfully');
        setIsInitialized(true);
      } catch (error) {
        console.error('Error initializing MediaPipe:', error);
      }
    };

    iMediaPipe();
  }, []);

  const aEyeContact = (landmarks) => {
    if (!landmarks || landmarks.length < 468) return;

    
    const leftEyeInner = landmarks[133];  
    const leftEyeOuter = landmarks[33];   
    const leftEyeTop = landmarks[159];    
    const leftEyeBottom = landmarks[145]; 
    
    
    const rightEyeInner = landmarks[362]; 
    const rightEyeOuter = landmarks[263]; 
    const rightEyeTop = landmarks[386];   
    const rightEyeBottom = landmarks[374]; 

    
    const leftEyeCenter = {
      x: (leftEyeInner.x + leftEyeOuter.x + leftEyeTop.x + leftEyeBottom.x) / 4,
      y: (leftEyeInner.y + leftEyeOuter.y + leftEyeTop.y + leftEyeBottom.y) / 4
    };

    const rightEyeCenter = {
      x: (rightEyeInner.x + rightEyeOuter.x + rightEyeTop.x + rightEyeBottom.x) / 4,
      y: (rightEyeInner.y + rightEyeOuter.y + rightEyeTop.y + rightEyeBottom.y) / 4
    };

    
    const eyeCenterX = (leftEyeCenter.x + rightEyeCenter.x) / 2;
    const eyeCenterY = (leftEyeCenter.y + rightEyeCenter.y) / 2;

    
    const centerX = 0.5;
    const centerY = 0.5;
    const maxDistance = 0.3; 
    
    const distanceFromCenter = Math.sqrt(
      Math.pow(eyeCenterX - centerX, 2) + Math.pow(eyeCenterY - centerY, 2)
    );
    
    
    const eContactPercentage = Math.max(0, Math.min(100, 
      (1 - distanceFromCenter / maxDistance) * 100
    ));

    
    const centerThreshold = 0.15; 
    const isLookingAtCamera = distanceFromCenter < centerThreshold;

    
    let gazeDirection = 'center';
    const horizontalDistance = Math.abs(eyeCenterX - centerX);
    const verticalDistance = Math.abs(eyeCenterY - centerY);
    
    if (horizontalDistance > verticalDistance) {
      if (eyeCenterX < 0.35) gazeDirection = 'left';
      else if (eyeCenterX > 0.65) gazeDirection = 'right';
    } else {
      if (eyeCenterY < 0.35) gazeDirection = 'up';
      else if (eyeCenterY > 0.65) gazeDirection = 'down';
    }

    const newEyeContactData = {
      isLookingAtCamera,
      eContactPercentage: Math.round(eContactPercentage),
      gazeDirection
    };

    console.log('Eye contact analysis:', newEyeContactData);
    setEyec(prev => ({
      ...prev,
      ...newEyeContactData
    }));
  };

  const aBodyLanguage = (landmarks) => {
    if (!landmarks || landmarks.length < 33) return;

    
    const nose = landmarks[0];
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    const leftEar = landmarks[7];
    const rightEar = landmarks[8];

    
    const keyLandmarks = [nose, leftShoulder, rightShoulder, leftHip, rightHip];
    const visibleLandmarks = keyLandmarks.filter(landmark => landmark.visibility > 0.5);
    
    if (visibleLandmarks.length < 3) {
      
      sBodyLanguage(prev => ({
        ...prev,
        confidence: Math.round((visibleLandmarks.length / keyLandmarks.length) * 100)
      }));
      return;
    }

    
    const shoulderCenter = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2
    };

    const hipCenter = {
      x: (leftHip.x + rightHip.x) / 2,
      y: (leftHip.y + rightHip.y) / 2
    };

    const earCenter = {
      x: (leftEar.x + rightEar.x) / 2,
      y: (leftEar.y + rightEar.y) / 2
    };

    
    const spineAlignment = Math.abs(shoulderCenter.x - hipCenter.x);
    
    
    const headAlignment = Math.abs(earCenter.x - shoulderCenter.x);
    
    
    const verticalAlignment = Math.abs(shoulderCenter.y - hipCenter.y);
    
    
    let postureScore = 100;
    
    
    if (spineAlignment > 0.08) postureScore -= 40;
    else if (spineAlignment > 0.06) postureScore -= 25;
    else if (spineAlignment > 0.04) postureScore -= 15;
    else if (spineAlignment > 0.02) postureScore -= 5;
    
    
    if (headAlignment > 0.06) postureScore -= 35;
    else if (headAlignment > 0.05) postureScore -= 20;
    else if (headAlignment > 0.03) postureScore -= 10;
    else if (headAlignment > 0.02) postureScore -= 3;

    
    if (verticalAlignment > 0.15) postureScore -= 25;
    else if (verticalAlignment > 0.1) postureScore -= 10;

    
    let posture = 'good';
    if (postureScore < 70) posture = 'slouched';
    else if (postureScore < 85) posture = 'slightly_off';

    
    let movementConfidence = 0;
    let stabilityBonus = 0;
    
    if (previousLandmarks) {
      
      const currentCenter = {
        x: (shoulderCenter.x + hipCenter.x) / 2,
        y: (shoulderCenter.y + hipCenter.y) / 2
      };
      
      const prevCenter = {
        x: (previousLandmarks.shoulderCenter.x + previousLandmarks.hipCenter.x) / 2,
        y: (previousLandmarks.shoulderCenter.y + previousLandmarks.hipCenter.y) / 2
      };
      
      const movement = Math.sqrt(
        Math.pow(currentCenter.x - prevCenter.x, 2) + 
        Math.pow(currentCenter.y - prevCenter.y, 2)
      );
      
      
      movementConfidence = Math.min(100, movement * 2000);
      
      
      if (movement < 0.01) {
        stabilityBonus = 15; 
      }
    }

    
    const visibilityConfidence = (visibleLandmarks.length / keyLandmarks.length) * 100;
    
    
    let postureBonus = 0;
    if (postureScore > 90) postureBonus = 10;
    else if (postureScore > 80) postureBonus = 5;
    
    
    const landmarkQuality = keyLandmarks.reduce((sum, landmark) => sum + landmark.visibility, 0) / keyLandmarks.length;
    const qualityBonus = Math.round(landmarkQuality * 20);
    
    
    const baseConfidence = Math.max(visibilityConfidence, movementConfidence);
    const totalConfidence = Math.min(100, baseConfidence + stabilityBonus + postureBonus + qualityBonus);

    
    setpreviouslandmarks({
      shoulderCenter,
      hipCenter,
      earCenter
    });

    const newBodyLanguageData = {
      posture,
      hGestures: bodyLanguageData.hGestures,
      movement: bodyLanguageData.movement,
      confidence: Math.round(totalConfidence)
    };

    console.log('Body language analysis:', {
      ...newBodyLanguageData,
      spineAlignment: spineAlignment.toFixed(3),
      headAlignment: headAlignment.toFixed(3),
      postureScore,
      confidenceBreakdown: {
        visibility: visibilityConfidence.toFixed(1),
        movement: movementConfidence.toFixed(1),
        stability: stabilityBonus,
        posture: postureBonus,
        quality: qualityBonus,
        total: totalConfidence.toFixed(1)
      }
    });
    
    
    sBodyLanguage(prev => ({
      ...prev,
      ...newBodyLanguageData
    }));
  };

  const analyzehGestures = (handLandmarks) => {
    if (!handLandmarks) return;

    
    let gestureCount = 0;
    
    handLandmarks.forEach(hand => {
      
      const thumb = hand[4];
      const index = hand[8];
      const middle = hand[12];
      const ring = hand[16];
      const pinky = hand[20];

      
      const fingersExtended = [thumb, index, middle, ring, pinky].filter(finger => 
        finger.y < hand[0].y 
      ).length;

      if (fingersExtended > 2) {
        gestureCount++;
      }
    });

    sBodyLanguage(prev => ({
      ...prev,
      hGestures: gestureCount
    }));
  };

  const processF = async () => {
    if (!isActive || !isInitialized || !videoR.current || !canvasRef.current) {
      if (!isActive) {
        console.log('Skipping frame - analysis not active');
      } else {
        console.log('Skipping frame - not ready:', { isInitialized, hasVideo: !!videoR.current, hasCanvas: !!canvasRef.current });
      }
      return;
    }

    const video = videoR.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    
    if (video.readyState < 2) {
      console.log('Video not ready, readyState:', video.readyState);
      return; 
    }

    
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 240;

    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    
    try {
      console.log('Sending frame to MediaPipe:', {
        canvasSize: `${canvas.width}x${canvas.height}`,
        hasFaceMesh: !!faceMeshRef.current,
        hasPose: !!poseRef.current,
        hasHands: !!handsRef.current
      });
      
      if (faceMeshRef.current) {
        await faceMeshRef.current.send({ image: canvas });
      }

      if (poseRef.current) {
        await poseRef.current.send({ image: canvas });
      }

      if (handsRef.current) {
        await handsRef.current.send({ image: canvas });
      }
    } catch (error) {
      console.error('Error processing frame:', error);
    }
  };

  
  useEffect(() => {
    console.log('Updating parent with new data:', {
      eyeContact: eyeContactData,
      bodyLanguage: bodyLanguageData
    });
    onUpdate({
      eyeContact: eyeContactData,
      bodyLanguage: bodyLanguageData
    });
  }, [eyeContactData, bodyLanguageData, onUpdate]);

  useEffect(() => {
    if (isInitialized && videoR.current && isActive) {
      const interval = setInterval(processF, 100); 
      return () => clearInterval(interval);
    }
  }, [isInitialized, isActive]);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'none' }} 
    />
  );
};

export default CompVisionAna;
