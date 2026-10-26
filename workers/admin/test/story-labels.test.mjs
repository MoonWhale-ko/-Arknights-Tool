import test from 'node:test';import assert from 'node:assert/strict';
import {storyLabel} from '../public/mining/story-labels.mjs';
test('story labels use owning storyline and actual episode number, including replays',()=>{
 assert.equal(storyLabel({zone:'main_8'}),'메인 스토리 · 8지역');
 assert.equal(storyLabel({zone:'permanent_main_2_zone1'}),'메인 스토리 · 16지역');
 assert.equal(storyLabel({category:'main',groupId:'main_16',idType:'milestone'}),'메인 스토리 · 16지역');
 assert.equal(storyLabel({zone:'permanent_sidestory_25_zone1'}),'사이드 스토리 · 영원한 오늘');
 assert.equal(storyLabel({zone:'permanent_sidestory_3_zone1'}),'사이드 스토리 · 테라 기담');
 assert.equal(storyLabel({zone:'permanent_sub_1_zone1'}),'사이드 스토리 · 방주');
 assert.equal(storyLabel({zone:'unknown'}),'');
});
