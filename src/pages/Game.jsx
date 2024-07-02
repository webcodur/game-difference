import React, { useState, useEffect } from 'react';
import { useAtom } from 'jotai';
import { useNavigate } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/scrollbar';
import { scoreAtom, userNameAtom, rankingAtom } from '../store';
import { coordinates } from '../assets/coordinates';
import {
	GameContainer,
	GameTitle,
	GameInfoWrapper,
	ImageContainer,
	ImageMark,
	ProgressContainer,
	ProgressBar,
	FoundIconContainer,
} from './Game.Style';
import { CheckCircleOutline, CircleOutlined } from '@mui/icons-material';

const roundTimeLimit = 90; // 라운드 당 시간 제한 (초)
const incorrectPenalty = 10; // 오답 시 차감 시간 (초)

function Game() {
	const [score, setScore] = useAtom(scoreAtom);
	const [userName] = useAtom(userNameAtom);
	const [ranking, setRanking] = useAtom(rankingAtom);

	const [round, setRound] = useState(0);
	const [message, setMessage] = useState('');
	const [foundDifferences, setFoundDifferences] = useState([]);
	const [marks, setMarks] = useState([]);
	const [timeLeft, setTimeLeft] = useState(roundTimeLimit);

	const navigate = useNavigate();
	const diffCoordinates = coordinates[round];

	useEffect(() => {
		const timer = setInterval(() => {
			setTimeLeft((prevTime) => {
				if (prevTime > 0) return prevTime - 1;
				else {
					handleNext();
					return 0;
				}
			});
		}, 1000);
		return () => clearInterval(timer);
	}, [round]);

	const handleImageMouseDown = (event, diffCoordinates) => {
		const imgElement = event.target;
		const rect = imgElement.getBoundingClientRect();

		const x = event.clientX - rect.left;
		const y = event.clientY - rect.top;

		const xRatio = imgElement.naturalWidth / rect.width;
		const yRatio = imgElement.naturalHeight / rect.height;

		const actualX = x * xRatio;
		const actualY = y * yRatio;

		const clickRadius = 30;

		const isCorrect = diffCoordinates.some(
			(diff) =>
				Math.sqrt(
					Math.pow(diff.x - actualX, 2) + Math.pow(diff.y - actualY, 2)
				) < clickRadius
		);

		const mark = {
			x: (x / rect.width) * 100,
			y: (y / rect.height) * 100,
			correct: isCorrect,
			id: new Date().getTime(), // 고유 ID 생성
		};

		if (isCorrect) {
			const alreadyFound = foundDifferences.some(
				(diff) =>
					Math.sqrt(
						Math.pow(diff.x - actualX, 2) + Math.pow(diff.y - actualY, 2)
					) < clickRadius
			);

			if (!alreadyFound) {
				setMessage('정답입니다!');
				setScore(score + 100); // 각 정답 100점
				setFoundDifferences([...foundDifferences, { x: actualX, y: actualY }]);
				setMarks([...marks, mark]);

				if (foundDifferences.length + 1 === diffCoordinates.length) {
					setTimeout(handleNext, 1000);
				}
			} else {
				setMessage('이미 찾은 차이점입니다!');
			}
		} else {
			setMessage('틀렸습니다!');
			setTimeLeft((prevTime) => Math.max(prevTime - incorrectPenalty, 0)); // 오답 시 시간 차감
			setMarks([...marks, mark]);

			setTimeout(() => {
				setMarks((prevMarks) => prevMarks.filter((m) => m.id !== mark.id));
			}, 1000); // 각 마크를 개별적으로 관리하여 일정 시간 후 사라지게 함
		}
	};

	const handleNext = () => {
		if (round < coordinates.length - 1) {
			setRound(round + 1);
			setFoundDifferences([]);
			setMessage('');
			setMarks([]);
			setTimeLeft(roundTimeLimit); // 다음 라운드 타이머 초기화
		} else {
			const newRanking = [
				...ranking,
				{
					name: userName || '익명',
					score,
					date: new Date().toLocaleString(),
				},
			].sort((a, b) => b.score - a.score); // 점수 내림차순 정렬

			if (newRanking.length > 10) newRanking.splice(10); // 10위까지만 관리
			setRanking(newRanking);
			localStorage.setItem('ranking', JSON.stringify(newRanking));
			navigate('/ranking');
		}
	};

	const handleSlideChange = (swiper) => {
		if (swiper.activeIndex !== round) {
			swiper.slideTo(round);
		}
	};

	const ImageWithMarks = ({ src, diffCoordinates }) => (
		<ImageContainer>
			<img
				src={`${process.env.PUBLIC_URL}${src}`}
				alt="이미지"
				width="100%"
				onMouseDown={(e) => handleImageMouseDown(e, diffCoordinates)}
				draggable="false" // 드래그 방지
				onDragStart={(e) => e.preventDefault()} // 드래그 방지
			/>
			{marks.map((mark, i) => (
				<ImageMark key={i} x={mark.x} y={mark.y} correct={mark.correct}>
					{!mark.correct && 'X'}
				</ImageMark>
			))}
		</ImageContainer>
	);

	const renderFoundIcons = () => {
		return (
			<FoundIconContainer>
				{diffCoordinates.map((_, index) =>
					foundDifferences.length > index ? (
						<CheckCircleOutline key={index} color="primary" />
					) : (
						<CircleOutlined key={index} color="disabled" />
					)
				)}
			</FoundIconContainer>
		);
	};

	const progressBarColor = () => {
		const percentage = (timeLeft / roundTimeLimit) * 100;
		if (percentage > 50) return 'green';
		else if (percentage > 25) return 'yellow';
		else return 'red';
	};

	return (
		<GameContainer>
			<ProgressContainer>
				<ProgressBar
					style={{
						height: `${(timeLeft / roundTimeLimit) * 100}%`,
						backgroundColor: progressBarColor(),
					}}>
					<div style={{ height: '100%', backgroundColor: 'transparent' }} />
				</ProgressBar>
			</ProgressContainer>
			<>
				<GameTitle>
					{round + 1} 라운드 ({round + 1}/{coordinates.length})
				</GameTitle>
				<GameInfoWrapper>
					{renderFoundIcons()}
					<p>점수: {score}점</p>
					<p>남은 시간: {timeLeft}초</p>
				</GameInfoWrapper>
				<Swiper
					spaceBetween={50}
					slidesPerView={1}
					navigation={false}
					pagination={{ clickable: true }}
					scrollbar={{ draggable: true }}
					onSlideChange={handleSlideChange}
					allowTouchMove={false}>
					{coordinates.map((_, index) => (
						<SwiperSlide key={index}>
							<div style={{ display: 'flex', justifyContent: 'space-between' }}>
								<ImageWithMarks
									src={`/images/img${round + 1}1.jpg`}
									diffCoordinates={diffCoordinates}
								/>
								<ImageWithMarks
									src={`/images/img${round + 1}2.jpg`}
									diffCoordinates={diffCoordinates}
								/>
							</div>
						</SwiperSlide>
					))}
				</Swiper>
				{message && <div>{message}</div>}
			</>
		</GameContainer>
	);
}

export default Game;