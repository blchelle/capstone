import React, { useEffect, useState } from 'react';
import {
  Badge, Container, Paper, Text, TextInput, useMantineTheme,
} from '@mantine/core';
import {
  RaceData, TypeMessage, WsUser, UsePowerupMessage,
} from '@utils/types';
import useUser from '@hooks/useUser';

import '../styles/powerups.css';
import { useFocusTrap } from '@mantine/hooks';
import FinishModal from './FinishModal';

// Handles all typing inputs and server update outputs, all server messages.
// Functional requirements listed below

interface TypingZoneProps {
  raceInfo: RaceData,
  websocket?: any
}

const TypingZone: React.FC<TypingZoneProps> = ({ websocket, raceInfo }) => {
  const { colors } = useMantineTheme();
  const { username } = useUser();
  const focusTrapRef = useFocusTrap(raceInfo.hasStarted);

  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentWordInput, setCurrentWordInput] = useState('');
  const [currentCharIndex, setCurrentCharIndex] = useState<number>(0);
  const [typingState, setTypingState] = useState<'Correct'|'Error'|'Powerup'>('Correct');
  const [effectIndex, setEffectIndex] = useState(0);
  const [effects, setEffects] = useState<string[]>([]);

  let passage;
  if (!raceInfo.passage) {
    passage = 'waiting for passage...';
  } else if (effects.includes('doubletap')) {
    passage = raceInfo.passage.split(' ').map((word, i) => (i === currentWordIndex ? word + word : word)).join(' ');
  } else {
    passage = raceInfo.passage;
  }

  const blurb = passage.split(' ');

  // This function handles input changes FR8
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (effects.includes('knockout')) return;

    const { value } = event.target;

    const { inventory } = raceInfo.userInfo[username];

    const targetWord = blurb[currentWordIndex];
    const typedChars = [...blurb.slice(0, currentWordIndex), ''].join(' ').length + lastMatchingCharIndex(event.target.value, `${targetWord} `);
    setCurrentCharIndex(typedChars);

    if (
      value === `${targetWord} `
      || (value === targetWord && currentWordIndex === blurb.length - 1)
    ) {
      setTypingState('Correct');
      setCurrentWordIndex(currentWordIndex + 1);
      setCurrentWordInput('');

      // forces user to type the same text twice: FR17
      if (effects.includes('doubletap')) {
        setCurrentCharIndex(currentCharIndex - Math.ceil(targetWord.length / 2) + 1);
      }

      sendTypingUpdate(typedChars);
    } else if (inventory && (value.toLowerCase() === `#${inventory} `)) {
      setTypingState('Correct');
      setCurrentWordInput('');
      const powerupMessage: UsePowerupMessage = {
        type: 'powerup',
        powerup: inventory,
      };
      websocket?.send(JSON.stringify(powerupMessage));
    } else if (value === targetWord.substring(0, value.length)) {
      setTypingState('Correct');
      setCurrentWordInput(event.target.value);
      sendTypingUpdate(typedChars);
    } else if (inventory && (value.toLowerCase() === `#${inventory}`?.substring(0, value.length))) {
      setTypingState('Powerup');
      setCurrentWordInput(event.target.value);
    } else {
      setTypingState('Error');
      setCurrentWordInput(event.target.value);
    }
  };

  // Handles incoming powerup effects, triggers them to start and handles their endings: FR15
  useEffect(() => {
    if (raceInfo.activeEffects.length === 0 || !raceInfo.activeEffects[effectIndex]) {
      return;
    }
    const { powerupType, user, target } = raceInfo.activeEffects[effectIndex];
    const powerIndexClosure = effectIndex;
    setEffectIndex(effectIndex + 1);
    if (user === username || (target && target !== username)) {
      return;
    }
    setEffects((localEffects) => [...localEffects, powerupType]);
    setTimeout(() => {
      setEffects((localEffects) => {
        const index = localEffects.indexOf(powerupType);
        if (index > -1) {
          const effectsCopy = [...localEffects];
          effectsCopy.splice(index, 1);
          return effectsCopy;
        }
        return localEffects;
      });
    }, raceInfo.activeEffects[powerIndexClosure].endTime - Date.now());
  }, [raceInfo.activeEffects]);

  const getBackgroundColor = () => {
    switch (typingState) {
      case ('Error'):
        return colors.red[5];
      case ('Powerup'):
        return colors.pink[5];
      case ('Correct'):
        return 'auto';
      default:
        return 'auto';
    }
  };

  const lastMatchingCharIndex = (s1:string, s2:string):number => {
    let i;
    for (i = 0; i < Math.min(s1.length, s2.length); i += 1) {
      if (s1[i] !== s2[i]) { break; }
    }
    return i;
  };

  const sendTypingUpdate = (charsTyped: number) => {
    const typeMessage: TypeMessage = {
      type: 'type',
      charsTyped,
    };
    websocket?.send(JSON.stringify(typeMessage));
  };

  // Displays cursors for user and opponents in correct places on screen: FR10
  const renderCursor = (charIndex: number, renderRaceInfo: RaceData): JSX.Element | null => {
    if (!raceInfo.hasStarted) return null;

    const localUser = {
      ...renderRaceInfo.userInfo[username],
      charsTyped: currentCharIndex,
    };
    const lUserInfo: {[key: string]: WsUser; } = {
      ...renderRaceInfo.userInfo,
      [username]: localUser,
    };
    const cursor = Object.values(lUserInfo)
      .filter((user) => user.charsTyped === charIndex)
      .map((user) => (
        <span
          style={{
            width: '2px',
            top: 0,
            backgroundColor: user.color,
            left: 0,
            display: 'inline-block',
            height: '1rem',
            position: 'absolute',
          }}
        />
      ))[0] || null;

    return cursor;
  };

  return (
    <Container size="sm" padding={0}>
      <FinishModal
        raceInfo={raceInfo}
        websocket={websocket}
        opened={currentWordIndex === blurb.length}
      />
      <Paper padding="xl" style={{ backgroundColor: colors.blue[1], position: 'relative' }}>
        <div className="relative w-full h-8 mb-8">
          <div
            className="h-full w-8 top-0 bg-primary absolute"
            style={{ left: `${(100 * currentWordIndex) / blurb.length}%` }}
          />
        </div>
        <div id="passage" className="rounded-lg bg-gray-200 p-8">
          <div
            className={effects.includes('rumble') ? 'rumble' : ''}
            style={{ userSelect: 'none' }}
          >
            {passage.split('').map((letter, charIndex) => {
              const color = (charIndex < currentCharIndex) ? colors.green[8] : colors.gray[9];
              // Replaces the text with a lighter version of the same text: FR16
              const baseOpacity = effects.includes('whiteout') ? 0.07 : 1;
              const opacity = (charIndex < currentCharIndex) ? 1 : baseOpacity;

              return (
                // eslint-disable-next-line react/no-array-index-key
                <Text key={charIndex} style={{ display: 'inline', position: 'relative', color }}>
                  {renderCursor(charIndex, raceInfo)}
                  <span style={{ opacity }}>{letter}</span>
                </Text>
              );
            })}
          </div>
          { /* An invisible copy of the text for when rumble is on, it maintains the box height */
          // Replaces the text with a rumbling version of the same text: FR18
            effects.includes('rumble') && (
            <div style={{ opacity: 0 }}>
              <Text>{passage}</Text>
            </div>
            )
          }
          <TextInput
            styles={{ defaultVariant: { backgroundColor: getBackgroundColor() } }}
            onChange={handleInputChange}
            value={currentWordInput}
            // Disables input box so text cannot be typed: FR19
            disabled={currentWordIndex === blurb.length || effects.includes('knockout') || !raceInfo.hasStarted}
            mt="lg"
            ref={focusTrapRef}
          />
          {currentWordIndex === blurb.length && <p>You Win!</p>}
        </div>
        <div>
          <Badge color="pink" size="lg" variant="filled" style={{ marginTop: '15px', visibility: raceInfo.userInfo[username].inventory ? 'visible' : 'hidden' }}>{`#${raceInfo.userInfo[username].inventory}`}</Badge>
        </div>
      </Paper>
    </Container>
  );
};

export default TypingZone;
