<?php
/**
 * OPcache GUI index controller
 *
 * @category  Amadeco
 * @package   Amadeco_OpcacheGui
 * @author    Ilan Parmentier
 * @copyright Copyright © Amadeco. All rights reserved.
 * @license   MIT License
 */
declare(strict_types=1);

namespace Amadeco\OpcacheGui\Controller\Adminhtml\Gui;

use Magento\Backend\App\Action;
use Magento\Backend\App\Action\Context;
use Magento\Framework\App\Action\HttpGetActionInterface;
use Magento\Framework\Controller\ResultInterface;
use Magento\Framework\View\Result\PageFactory;

/**
 * Main controller for the OPcache GUI module
 */
class Index extends Action implements HttpGetActionInterface
{
    /**
     * Authorization level of a basic admin session
     *
     * @see _isAllowed()
     */
    public const string ADMIN_RESOURCE = 'Amadeco_OpcacheGui::gui_index';

    /**
     * Constructor
     *
     * @param Context $context
     * @param PageFactory $resultPageFactory
     */
    public function __construct(
        Context $context,
        protected readonly PageFactory $resultPageFactory
    ) {
        parent::__construct($context);
    }

    /**
     * Execute view action
     *
     * @return ResultInterface
     */
    public function execute(): ResultInterface
    {
        $resultPage = $this->resultPageFactory->create();
        $resultPage->setActiveMenu('Amadeco_OpcacheGui::gui_index');
        $resultPage->getConfig()->getTitle()->prepend(__('PHP OpCache Dashboard'));

        return $resultPage;
    }
}