import { defineComponent } from "ecsplain"

export type ApprovalVariantData = "direct" | "review"

export interface ApprovalErrorData {
	readonly message: string
}

export const ApprovalEnabled = defineComponent<boolean>("ApprovalEnabled")
export const ApprovalVariant =
	defineComponent<ApprovalVariantData>("ApprovalVariant")
export const ApprovalReview = defineComponent<true>("ApprovalReview")
export const PendingApproval = defineComponent<true>("PendingApproval")
export const ApprovalError = defineComponent<ApprovalErrorData>("ApprovalError")
