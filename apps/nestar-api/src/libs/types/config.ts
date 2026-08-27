import { ObjectId } from 'bson';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

export const availableAgentSorts = ['createAt', 'updatedAt', 'memberLikes', 'memberViews', 'memberRank'];
export const availableMemberSorts = ['createAt', 'updatedAt', 'memberLikes', 'memberViews'];

/**  IMAGE CONFIGURATION (config.js) **/

export const validMimeTypes = ['.png', '.jpg', '.jpeg'];
export const getSerialForImage = (filename: string) => {
	const ext = path.parse(filename).ext;
	return uuidv4() + ext;
};

export const shapeIntoMongoObjectId = (target: any) => {
	return typeof target === 'string' ? new ObjectId(target) : target;
};
