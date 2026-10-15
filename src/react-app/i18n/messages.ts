import * as generatedMessages from "../paraglide/messages.js"

export const messages = {
	app: {
		name: generatedMessages.appName,
		documentTitle: generatedMessages.documentTitle,
	},
	auth: {
		loading: generatedMessages.authLoading,
		signInHeading: generatedMessages.signInHeading,
		signInDescription: generatedMessages.signInDescription,
		signInActionTitle: generatedMessages.signInActionTitle,
	},
	bootstrap: {
		loading: generatedMessages.bootstrapLoading,
		errorTitle: generatedMessages.bootstrapErrorTitle,
		networkErrorDescription: generatedMessages.networkErrorDescription,
		invalidResponseDescription: generatedMessages.invalidResponseDescription,
	},
	action: {
		retry: generatedMessages.retry,
		retrying: generatedMessages.retrying,
		backToHome: generatedMessages.backToHome,
		skipToContent: generatedMessages.skipToContent,
	},
	navigation: {
		label: generatedMessages.navigationLabel,
		home: generatedMessages.navigationHome,
		expenses: generatedMessages.navigationExpenses,
		settings: generatedMessages.navigationSettings,
	},
	home: {
		title: generatedMessages.homeTitle,
		spentLabel: generatedMessages.homeSpentLabel,
		categoriesTitle: generatedMessages.homeCategoriesTitle,
		otherCategories: generatedMessages.homeOtherCategories,
		addExpense: generatedMessages.homeAddExpense,
	},
	monthly: {
		loading: generatedMessages.monthlyLoading,
		errorTitle: generatedMessages.monthlyErrorTitle,
		uncategorized: generatedMessages.monthlyUncategorized,
	},
	category: {
		food: generatedMessages.categoryFood,
		daily_goods: generatedMessages.categoryDailyGoods,
		housing: generatedMessages.categoryHousing,
		utilities: generatedMessages.categoryUtilities,
		communications: generatedMessages.categoryCommunications,
		transportation: generatedMessages.categoryTransportation,
		medical: generatedMessages.categoryMedical,
		entertainment: generatedMessages.categoryEntertainment,
		other: generatedMessages.categoryOther,
	},
	expenses: {
		title: generatedMessages.expensesTitle,
		add: generatedMessages.expensesAdd,
		previousMonth: generatedMessages.expensesPreviousMonth,
		nextMonth: generatedMessages.expensesNextMonth,
		monthListTitle: generatedMessages.expensesMonthListTitle,
		totalLabel: generatedMessages.expensesTotalLabel,
		emptyHint: generatedMessages.expensesEmptyHint,
		formTitle: generatedMessages.expensesFormTitle,
		editTitle: generatedMessages.expensesEditTitle,
		edit: generatedMessages.expensesEdit,
		save: generatedMessages.expensesSave,
		saving: generatedMessages.expensesSaving,
		delete: generatedMessages.expensesDelete,
		deleting: generatedMessages.expensesDeleting,
		deleteTitle: generatedMessages.expensesDeleteTitle,
		deleteDescription: generatedMessages.expensesDeleteDescription,
		cancel: generatedMessages.expensesCancel,
		filterAll: generatedMessages.expensesFilterAll,
		filterCategoryLabel: generatedMessages.expensesFilterCategoryLabel,
		filteredEmpty: generatedMessages.expensesFilteredEmpty,
		resultCount: generatedMessages.expensesResultCount,
		clearFilter: generatedMessages.expensesClearFilter,
		missing: generatedMessages.expensesMissing,
		hiddenCategory: generatedMessages.expensesHiddenCategory,
		dateLabel: generatedMessages.expensesDateLabel,
		amountLabel: generatedMessages.expensesAmountLabel,
		amountUnit: generatedMessages.expensesAmountUnit,
		categoryLabel: generatedMessages.expensesCategoryLabel,
		formCategoryLabel: generatedMessages.expensesFormCategoryLabel,
		categoryOptional: generatedMessages.expensesCategoryOptional,
		memoLabel: generatedMessages.expensesMemoLabel,
		memoPlaceholder: generatedMessages.expensesMemoPlaceholder,
		submit: generatedMessages.expensesSubmit,
		submitting: generatedMessages.expensesSubmitting,
		created: generatedMessages.expensesCreated,
		invalidDate: generatedMessages.expensesInvalidDate,
		invalidAmount: generatedMessages.expensesInvalidAmount,
		invalidCategory: generatedMessages.expensesInvalidCategory,
		invalidMemo: generatedMessages.expensesInvalidMemo,
	},
	settings: {
		title: generatedMessages.settingsTitle,
		languageLabel: generatedMessages.settingsLanguageLabel,
		languageJapanese: generatedMessages.settingsLanguageJapanese,
		languageEnglish: generatedMessages.settingsLanguageEnglish,
		languageSpanish: generatedMessages.settingsLanguageSpanish,
		accountLabel: generatedMessages.settingsAccountLabel,
		categoriesTitle: generatedMessages.settingsCategoriesTitle,
		categoriesLoading: generatedMessages.settingsCategoriesLoading,
		categoryName: generatedMessages.settingsCategoryName,
		selectIcon: generatedMessages.settingsSelectIcon,
		moreIcons: generatedMessages.settingsMoreIcons,
		categoryPlaceholder: generatedMessages.settingsCategoryPlaceholder,
		categoryInvalidName: generatedMessages.settingsCategoryInvalidName,
		initialCategory: generatedMessages.settingsInitialCategory,
		addCategory: generatedMessages.settingsAddCategory,
		saveCategory: generatedMessages.settingsSaveCategory,
		cancelCategory: generatedMessages.settingsCancelCategory,
		renameCategory: generatedMessages.settingsRenameCategory,
		deleteCategory: generatedMessages.settingsDeleteCategory,
		deleteCategoryTitle: generatedMessages.settingsDeleteCategoryTitle,
		deleteCategoryDescription: generatedMessages.settingsDeleteCategoryDescription,
		confirmDeleteCategory: generatedMessages.settingsConfirmDeleteCategory,
	},
	route: {
		notFoundTitle: generatedMessages.notFoundTitle,
		notFoundDescription: generatedMessages.notFoundDescription,
		errorTitle: generatedMessages.routeErrorTitle,
		errorDescription: generatedMessages.routeErrorDescription,
	},
} as const

export function formatDocumentTitle(page: string) {
	return messages.app.documentTitle({ page })
}

export function languageName(locale: string | null): string {
	switch (locale) {
		case "ja":
			return messages.settings.languageJapanese()
		case "es":
			return messages.settings.languageSpanish()
		default:
			return messages.settings.languageEnglish()
	}
}
