import { ObjectId } from 'bson';

export const availableAgentSorts = ['createAt', 'updatedAt', 'memberLikes', 'memberViews', 'memberRank'];
export const availableMemberSorts = ['createAt', 'updatedAt', 'memberLikes', 'memberViews'];

export const shapeIntoMongoObjectId = (target: any) => {
	return typeof target === 'string' ? new ObjectId(target) : target;
};
